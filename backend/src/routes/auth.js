const express = require("express");
const router = express.Router();
const { login, register, setPin } = require("../services/auth");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ error: "Phone and PIN are required" });
    }

    const result = await login(phone, pin);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, pin } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: "name, email and phone are required" });
    }

    const result = await register({ name, email, phone, pin });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/set-pin
router.post("/set-pin", async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ error: "Phone and PIN are required" });
    }

    const result = await setPin(phone, pin);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
