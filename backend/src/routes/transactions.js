const express = require("express");
const router = express.Router();
const prisma = require("../db");
const { parseTranscript } = require("../services/claude");
const { getIO } = require("../services/socket");
const { maskUpiId, hashUpiId } = require("../services/privacy");

function inferPersonName(rawTranscript) {
  const raw = String(rawTranscript || "").trim();
  if (!raw) return "";

  // Normalize lightly (keep latin letters) and grab the first meaningful token.
  // Examples we want to catch:
  // - "priyanka paid 100 online" => priyanka
  // - "rajesh ke 200 cash" => rajesh
  // - "Ramu bhai 600 upi" => ramu bhai
  const lowered = raw.toLowerCase();

  // Stop words/verbs that often follow the name.
  const stopWords = [
    "paid",
    "pay",
    "payed",
    "sent",
    "received",
    "gave",
    "give",
    "de",
    "diya",
    "liye",
    "lia",
    "ne",
    "ke",
    "ka",
    "ki",
    "ko",
    "se",
    "rupaye",
    "rupees",
    "rs",
    "cash",
    "upi",
    "online",
    "paytm",
    "gpay",
    "phonepe",
    "total",
    "bill",
    "amount",
    "udhaar",
    "credit",
    "baaki",
    "remaining",

    // Common Hindi postpositions/particles
    "par",
    "pe",
    "पर",
    "पे",
    "ke",
    "के",
    "ki",
    "की",
    "ka",
    "का",
    "ko",
    "को",
    "se",
    "से",
    "ne",
    "ने",

    // Common Hindi payment keywords
    "ऑनलाइन",
    "यूपीआई",
    "upi",
    "online",
    "कैश",
    "नकद",
    "cash",
    "उधार",
    "udhaar",
    "बाकी",
    "baaki",
    "टोटल",
    "कुल",
    "total",
    "बिल",
    "bill",
  ];

  // Take up to first 3 tokens before a stopword/number.
  const tokens = lowered
    .replace(/[₹,]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);

  const nameTokens = [];
  for (const t of tokens) {
    if (/^-?\d/.test(t)) break;
    if (stopWords.includes(t)) break;
    // Accept latin and Devanagari letters as name tokens
    if (!/^([a-z]+|[\u0900-\u097f]+)$/u.test(t)) continue;
    nameTokens.push(t);
    if (nameTokens.length >= 3) break;
  }

  if (!nameTokens.length) return "";
  const name = nameTokens.join(" ");

  // If it's Devanagari, keep as-is; if latin, capitalize.
  if (/[\u0900-\u097f]/u.test(name)) return name;
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// GET /api/transactions — recent payments/transactions for merchant
router.get("/", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const items = await prisma.transaction.findMany({
      where: { merchantId: Number(merchantId) },
      orderBy: { createdAt: "desc" },
      take: Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 20,
    });

    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to load transactions" });
  }
});

// POST /api/transactions/voice
router.post("/voice", async (req, res) => {
  const { transcript } = req.body;
  const merchantId = req.merchant.id; // from auth middleware

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    const inferredName = inferPersonName(transcript);
    const description = inferredName || "Voice Entry";

    // 1) Parse transcript (Claude or offline)
    const parsedResult = await parseTranscript(transcript);

    const total = Number(parsedResult?.total) || 0;
    const cash = Number(parsedResult?.cash) || 0;
    const upi = Number(parsedResult?.upi) || 0;
    let udhaar = Number(parsedResult?.udhaar) || 0;

    // 2) Ensure udhaar is consistent when total is present
    if (total > 0) {
      const inferred = total - (cash + upi);
      udhaar = inferred > 0 ? inferred : 0;
    }

    // If we couldn't detect anything meaningful, return a clear error
    if (total <= 0 && cash <= 0 && upi <= 0 && udhaar <= 0) {
      return res.status(422).json({
        error: "Could not detect amount/mode from voice. Try: 'online 100', 'cash 200', or 'total 1600 cash 500 online 800'.",
      });
    }

    // 3) Store split transactions so UI charts work (Cash/UPI/Udhaar)
    const txCreates = [];
    const createdTransactions = [];
    if (cash > 0) {
      txCreates.push(
        prisma.transaction.create({
          data: {
            amount: cash,
            type: "Cash",
            merchantId,
            description,
          },
        }).then((t) => {
          createdTransactions.push(t);
          return t;
        })
      );
    }
    if (upi > 0) {
      txCreates.push(
        prisma.transaction.create({
          data: {
            amount: upi,
            type: "UPI",
            merchantId,
            description,
          },
        }).then((t) => {
          createdTransactions.push(t);
          return t;
        })
      );
    }

    // 4) If udhaar exists, create udhaar entry and (optionally) a Udhaar transaction
    let udhaarEntry = null;
    if (udhaar > 0) {
      // Infer creditor name: "who recently paid 800 online" => latest matching UPI transaction
      let creditorName = inferredName || "Unknown";
      let upiId = null;
      if (upi > 0) {
        const recentMatchingUpi = await prisma.transaction.findFirst({
          where: {
            merchantId: Number(merchantId),
            type: "UPI",
            amount: upi,
            NOT: { description: { startsWith: "Voice:" } },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!inferredName && recentMatchingUpi?.description) creditorName = recentMatchingUpi.description;
      }

      // Fallback: if we still don't know the person, use the last known udhaar customer.
      if (creditorName === "Unknown") {
        const recentKnownCustomer = await prisma.udhaarEntry.findFirst({
          where: {
            merchantId: Number(merchantId),
            upiId: { not: null },
            creditorName: { not: "Unknown" },
          },
          orderBy: { createdAt: "desc" },
        });
        if (recentKnownCustomer?.creditorName) creditorName = recentKnownCustomer.creditorName;
        if (recentKnownCustomer?.upiId) upiId = recentKnownCustomer.upiId;
      }

      // If we can identify a person, prefer updating their existing pending udhaar entry
      // instead of creating a new row (feels like an ongoing ledger).
      const canUpdateExisting = Boolean(inferredName);
      if (canUpdateExisting) {
        const existingPending = await prisma.udhaarEntry.findFirst({
          where: {
            merchantId: Number(merchantId),
            status: "pending",
            creditorName: {
              equals: String(creditorName),
              mode: "insensitive",
            },
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingPending) {
          udhaarEntry = await prisma.udhaarEntry.update({
            where: { id: existingPending.id },
            data: {
              amount: existingPending.amount + udhaar,
					upiId: existingPending.upiId || upiId,
					upiIdMasked: existingPending.upiIdMasked || maskUpiId(existingPending.upiId || upiId),
					upiIdHash: existingPending.upiIdHash || hashUpiId(existingPending.upiId || upiId),
            },
          });
        }
      }

      if (!udhaarEntry) {
        udhaarEntry = await prisma.udhaarEntry.create({
          data: {
            amount: udhaar,
            creditorName,
            upiId,
				upiIdMasked: maskUpiId(upiId),
				upiIdHash: hashUpiId(upiId),
            status: "pending",
            merchantId,
          },
        });
      }

      txCreates.push(
        prisma.transaction.create({
          data: {
            amount: udhaar,
            type: "Udhaar",
            merchantId,
            description: creditorName,
          },
        }).then((t) => {
          createdTransactions.push(t);
          return t;
        })
      );
    }

    await Promise.all(txCreates);

    // Notify connected dashboards in real-time
    try {
      const io = getIO();
      for (const t of createdTransactions) {
        io.emit("transaction:created", t);
      }
      if (udhaarEntry) io.emit("udhaar:updated", udhaarEntry);
    } catch (_) {
      // Socket not initialized; ignore.
    }

    try {
      // Notify clients for "live" updates
      getIO().emit("transaction:created", { merchantId: Number(merchantId) });
      if (udhaarEntry) getIO().emit("udhaar:updated", { merchantId: Number(merchantId) });
    } catch (_) {
      // Socket not critical for core flow
    }

    return res.json({
      total,
      cash,
      upi,
      udhaar,
      udhaarEntry,
      createdTransactions,
    });
  } catch (error) {
    console.error("Error processing voice transaction:", error);
    res.status(500).json({ error: "Failed to process voice transaction" });
  }
});

module.exports = router;
