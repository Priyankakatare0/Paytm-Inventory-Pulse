const prisma = require("../db");
const { maskUpiId, hashUpiId } = require("./privacy");

function clampIntervalMins(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return 1440;
	// keep sane bounds: 5 mins to 30 days
	return Math.max(5, Math.min(60 * 24 * 30, Math.floor(n)));
}

async function getEntryOrThrow({ merchantId, id }) {
	if (!merchantId) throw new Error("merchantId is required");
	if (!id) throw new Error("id is required");

	const entry = await prisma.udhaarEntry.findFirst({
		where: { id: Number(id), merchantId: Number(merchantId) },
	});

	if (!entry) throw new Error("Udhaar entry not found");
	return entry;
}

async function listUdhaar(merchantId) {
	if (!merchantId) throw new Error("merchantId is required");

	return prisma.udhaarEntry.findMany({
		where: { merchantId: Number(merchantId) },
		orderBy: { createdAt: "desc" },
	});
}

async function createUdhaar({ merchantId, creditorName, upiId, amount, dueDate }) {
	if (!merchantId) throw new Error("merchantId is required");
	if (!creditorName) throw new Error("customer name is required");
	if (!upiId) throw new Error("UPI ID is required");
	if (amount == null) throw new Error("amount is required");

	return prisma.udhaarEntry.create({
		data: {
			merchantId: Number(merchantId),
			creditorName: String(creditorName),
			upiId: String(upiId),
			upiIdMasked: maskUpiId(upiId),
			upiIdHash: hashUpiId(upiId),
			amount: Number(amount),
			status: "pending",
			dueDate: dueDate ? new Date(dueDate) : null,
		},
	});
}

async function markPaid({ merchantId, id }) {
	const entry = await getEntryOrThrow({ merchantId, id });

	return prisma.udhaarEntry.update({
		where: { id: entry.id },
		data: {
			status: "paid",
			reminderEnabled: false,
			reminderNextAt: null,
		},
	});
}

async function scheduleReminder({ merchantId, id, enabled = true, intervalMins }) {
	const entry = await getEntryOrThrow({ merchantId, id });
	if (entry.status === "paid") throw new Error("Cannot schedule reminder for a paid entry");

	const interval = clampIntervalMins(intervalMins);
	return prisma.udhaarEntry.update({
		where: { id: entry.id },
		data: {
			reminderEnabled: Boolean(enabled),
			reminderIntervalMins: interval,
			reminderNextAt: Boolean(enabled) ? new Date() : null,
		},
	});
}

module.exports = { listUdhaar, createUdhaar, markPaid, scheduleReminder };
