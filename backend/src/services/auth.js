const prisma = require("../db");
const { generateToken } = require("../config/jwt");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

async function login(phone, pin) {
  const merchants = await prisma.merchant.findMany({ where: { phone }, take: 1 });
  const merchant = merchants[0];

  if (!merchant) throw new Error("Merchant not found");

  if (!merchant.pinHash) throw new Error("PIN not set for this account");

  const match = await bcrypt.compare(pin, merchant.pinHash);
  if (!match) throw new Error("Invalid PIN");

  const token = generateToken({ id: merchant.id, phone: merchant.phone, email: merchant.email, name: merchant.name });

  return {
    token,
    merchant: { id: merchant.id, name: merchant.name, email: merchant.email, phone: merchant.phone },
  };
}

async function register({ name, email, phone, pin }) {
  const existing = await prisma.merchant.findFirst({ where: { email } });
  if (existing) throw new Error("Merchant with this email already exists");

  // Default PIN is '1234' if none provided
  const rawPin = pin || "1234";
  const pinHash = await bcrypt.hash(rawPin, SALT_ROUNDS);

  const merchant = await prisma.merchant.create({
    data: { name, email, phone, pinHash },
  });

  // Generate token so client is logged in after register
  const token = generateToken({ id: merchant.id, phone: merchant.phone, email: merchant.email, name: merchant.name });

  // Return safe merchant object (omit pinHash)
  const safeMerchant = { id: merchant.id, name: merchant.name, email: merchant.email, phone: merchant.phone };

  return { token, merchant: safeMerchant };
}

async function setPin(phone, pin) {
  if (!phone || !pin) throw new Error("Phone and PIN are required");

  const merchant = await prisma.merchant.findFirst({ where: { phone } });
  if (!merchant) throw new Error("Merchant not found");

  const pinHash = await bcrypt.hash(String(pin), SALT_ROUNDS);

  const updated = await prisma.merchant.update({
    where: { id: merchant.id },
    data: { pinHash },
  });

  const token = generateToken({
    id: updated.id,
    phone: updated.phone,
    email: updated.email,
    name: updated.name,
  });

  return {
    message: "PIN set successfully",
    token,
    merchant: { id: updated.id, name: updated.name, email: updated.email, phone: updated.phone },
  };
}

module.exports = { login, register, setPin };
