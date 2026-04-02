const crypto = require("crypto");

function maskUpiId(raw) {
	const s = String(raw || "").trim();
	if (!s) return null;
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
}

function hashUpiId(raw) {
	const s = String(raw || "").trim();
	if (!s) return null;
	const salt = String(process.env.UPI_HASH_SALT || "upi_hash_salt");
	return crypto
		.createHash("sha256")
		.update(`${salt}:${s.toLowerCase()}`)
		.digest("hex");
}

module.exports = { maskUpiId, hashUpiId };
