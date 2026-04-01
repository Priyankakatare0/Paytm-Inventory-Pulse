const express = require("express");
const router = express.Router();
const prisma = require("../db");
const { parseTranscript } = require("../services/claude");

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
    // 1. Parse the transcript with Claude
    const parsedResult = await parseTranscript(transcript);

    // 2. If there's an udhaar amount, save it
    if (parsedResult.udhaar > 0) {
      await prisma.udhaarEntry.create({
        data: {
          amount: parsedResult.udhaar,
          creditorName: "Unknown", // Or try to extract from transcript
          status: "pending",
          merchantId: merchantId,
        },
      });
    }
    
    // 3. Also save the main transaction
    await prisma.transaction.create({
        data: {
            amount: parsedResult.total,
            type: "sale", // Assuming voice transactions are sales
            merchantId: merchantId,
            description: `Voice parsed: ${transcript}`
        }
    })

    // 4. Return the parsed result
    res.json(parsedResult);
  } catch (error) {
    console.error("Error processing voice transaction:", error);
    res.status(500).json({ error: "Failed to process voice transaction" });
  }
});

module.exports = router;
