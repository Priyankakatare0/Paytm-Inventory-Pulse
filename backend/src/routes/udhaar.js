const express = require("express");
const router = express.Router();
const { listUdhaar, createUdhaar, markPaid, scheduleReminder } = require("../services/udhaar");
const { sendUdhaarReminderEmail } = require("../services/reminders");
const { getIO } = require("../services/socket");

// GET /api/udhaar — list all credit entries for merchant
router.get("/", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    const items = await listUdhaar(merchantId);
    return res.json({ items });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// POST /api/udhaar — create entry (customer name + UPI ID + amount)
router.post("/", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    const { customerName, upiId, amount, dueDate } = req.body;

    const entry = await createUdhaar({
      merchantId,
      creditorName: customerName,
      upiId,
      amount,
      dueDate,
    });

    try {
      getIO().emit("udhaar:created", { merchantId, entryId: entry.id });
    } catch {
      // Socket is optional; ignore if not initialized.
    }

    return res.status(201).json({ entry });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// PATCH /api/udhaar/:id/paid — mark settled
router.patch("/:id/paid", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    const { id } = req.params;

    const entry = await markPaid({ merchantId, id });

    try {
      getIO().emit("udhaar:settled", { merchantId, entryId: entry.id });
    } catch {
      // ignore
    }

    return res.json({ entry });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// POST /api/udhaar/:id/reminder — schedule + optionally send now (email to merchant)
router.post("/:id/reminder", async (req, res) => {
  try {
    const merchantId = req.merchant?.id;
    const { id } = req.params;
    const { enabled = true, intervalMins, sendNow = true } = req.body || {};

    const entry = await scheduleReminder({ merchantId, id, enabled, intervalMins });

    let sent = false;
    let warning = null;
    if (sendNow && entry.reminderEnabled) {
      try {
        await sendUdhaarReminderEmail({ merchant: req.merchant, entry });
        sent = true;
      } catch (e) {
        warning = e?.message || "Email could not be sent";
      }
    }

    try {
      getIO().emit("udhaar:updated", { merchantId, entryId: entry.id, reminderEnabled: entry.reminderEnabled });
    } catch {
      // ignore
    }

    return res.json({ entry, sent, warning });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;