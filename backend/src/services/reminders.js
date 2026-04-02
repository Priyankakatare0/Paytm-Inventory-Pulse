const cron = require("node-cron");
const nodemailer = require("nodemailer");
const prisma = require("../db");

function getMailTransporter() {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!host || !user || !pass) return null;

	return nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
	});
}

function getFromAddress() {
	return process.env.SMTP_FROM || process.env.SMTP_USER;
}

function buildUdhaarReminderEmail({ merchantName, entry }) {
	const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
	const maskUpiId = (raw) => {
		const s = String(raw || "").trim();
		if (!s) return "—";
		const at = s.indexOf("@");
		if (at <= 1) {
			if (s.length <= 4) return "***";
			return `${s.slice(0, 1)}***${s.slice(-1)}`;
		}
		const user = s.slice(0, at);
		const domain = s.slice(at + 1);
		const userMasked = user.length <= 2 ? "***" : `${user.slice(0, 2)}***`;
		const domainMasked = domain.length <= 2 ? "***" : `***${domain.slice(-2)}`;
		return `${userMasked}@${domainMasked}`;
	};
	const dueDateText = entry.dueDate
		? new Date(entry.dueDate).toLocaleDateString("en-IN")
		: "—";

	const subject = `Udhaar Reminder: ${entry.creditorName} - ${fmt(entry.amount)}`;
	const text = [
		`Hi ${merchantName || ""}`.trim() + ",",
		"",
		"This is your Udhaar reminder:",
		`- Customer: ${entry.creditorName}`,
		`- Amount Due: ${fmt(entry.amount)}`,
		`- UPI ID: ${entry.upiIdMasked || maskUpiId(entry.upiId)}`,
		`- Due Date: ${dueDateText}`,
		"",
		"InventoryPulse",
	].join("\n");

	return { subject, text };
}

async function sendUdhaarReminderEmail({ merchant, entry }) {
	if (String(process.env.DEMO_MODE || "").toLowerCase() === "true") {
		return;
	}

	const transporter = getMailTransporter();
	if (!transporter) {
		throw new Error(
			"SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optional SMTP_FROM)."
		);
	}
	if (!merchant?.email) throw new Error("Merchant email is missing");

	const from = getFromAddress();
	if (!from) throw new Error("SMTP_FROM/SMTP_USER is missing");

	const { subject, text } = buildUdhaarReminderEmail({ merchantName: merchant.name, entry });

	await transporter.sendMail({
		from,
		to: merchant.email,
		subject,
		text,
	});
}

async function processDueUdhaarReminders() {
	const now = new Date();

	const due = await prisma.udhaarEntry.findMany({
		where: {
			reminderEnabled: true,
			reminderNextAt: { lte: now },
			status: { not: "paid" },
		},
		include: {
			merchant: { select: { id: true, name: true, email: true } },
		},
		orderBy: { reminderNextAt: "asc" },
		take: 50,
	});

	for (const entry of due) {
		try {
			await sendUdhaarReminderEmail({ merchant: entry.merchant, entry });
			const intervalMins = Math.max(5, Number(entry.reminderIntervalMins || 1440));
			const nextAt = new Date(now.getTime() + intervalMins * 60 * 1000);

			await prisma.udhaarEntry.update({
				where: { id: entry.id },
				data: {
					reminderLastSentAt: now,
					reminderNextAt: nextAt,
				},
			});
		} catch (e) {
			// Avoid tight loops if SMTP is down; back off 30 minutes.
			await prisma.udhaarEntry.update({
				where: { id: entry.id },
				data: {
					reminderNextAt: new Date(now.getTime() + 30 * 60 * 1000),
				},
			});
			// eslint-disable-next-line no-console
			console.error("Failed to send udhaar reminder", {
				entryId: entry.id,
				error: e?.message || String(e),
			});
		}
	}
}

function startReminderCron() {
	// Every minute
	cron.schedule("* * * * *", async () => {
		try {
			await processDueUdhaarReminders();
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error("Reminder cron failed", e?.message || e);
		}
	});
}

module.exports = { startReminderCron, processDueUdhaarReminders, sendUdhaarReminderEmail };
