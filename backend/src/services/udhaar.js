const prisma = require("../db");

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
			amount: Number(amount),
			status: "pending",
			dueDate: dueDate ? new Date(dueDate) : null,
		},
	});
}

async function markPaid({ merchantId, id }) {
	if (!merchantId) throw new Error("merchantId is required");
	if (!id) throw new Error("id is required");

	const entry = await prisma.udhaarEntry.findFirst({
		where: { id: Number(id), merchantId: Number(merchantId) },
	});

	if (!entry) throw new Error("Udhaar entry not found");

	return prisma.udhaarEntry.update({
		where: { id: entry.id },
		data: { status: "paid" },
	});
}

module.exports = { listUdhaar, createUdhaar, markPaid };
