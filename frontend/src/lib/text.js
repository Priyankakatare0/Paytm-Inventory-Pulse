function isDevanagari(text) {
	return /[\u0900-\u097f]/u.test(String(text || ""));
}

// Very lightweight Devanagari (Hindi) -> Latin transliteration.
// This is NOT perfect Hindi transliteration, but it is good enough for
// common customer names in a hackathon demo (e.g., अमित -> Amit).
function devanagariToLatin(input) {
	const s = String(input || "").trim();
	if (!s) return "";

	// Independent vowels
	const vowels = {
		"अ": "a",
		"आ": "aa",
		"इ": "i",
		"ई": "ii",
		"उ": "u",
		"ऊ": "uu",
		"ए": "e",
		"ऐ": "ai",
		"ओ": "o",
		"औ": "au",
		"ऋ": "ri",
	};

	// Consonants (with inherent 'a' unless matra/virama changes it)
	const cons = {
		"क": "k",
		"ख": "kh",
		"ग": "g",
		"घ": "gh",
		"ङ": "ng",
		"च": "ch",
		"छ": "chh",
		"ज": "j",
		"झ": "jh",
		"ञ": "ny",
		"ट": "t",
		"ठ": "th",
		"ड": "d",
		"ढ": "dh",
		"ण": "n",
		"त": "t",
		"थ": "th",
		"द": "d",
		"ध": "dh",
		"न": "n",
		"प": "p",
		"फ": "ph",
		"ब": "b",
		"भ": "bh",
		"म": "m",
		"य": "y",
		"र": "r",
		"ल": "l",
		"व": "v",
		"श": "sh",
		"ष": "sh",
		"स": "s",
		"ह": "h",
		"ळ": "l",
		"क्ष": "ksh",
		"त्र": "tr",
		"ज्ञ": "gy",
	};

	// Vowel signs (matras)
	const matras = {
		"ा": "aa",
		"ि": "i",
		"ी": "ii",
		"ु": "u",
		"ू": "uu",
		"े": "e",
		"ै": "ai",
		"ो": "o",
		"ौ": "au",
		"ृ": "ri",
	};

	const virama = "्";
	const anusvara = "ं";
	const chandrabindu = "ँ";
	const visarga = "ः";

	let out = "";
	const chars = Array.from(s);

	function peek(i) {
		return i >= 0 && i < chars.length ? chars[i] : "";
	}

	for (let i = 0; i < chars.length; i++) {
		const ch = chars[i];

		// Preserve spaces and basic separators
		if (/\s/.test(ch)) {
			out += " ";
			continue;
		}
		if (/[0-9]/.test(ch)) {
			out += ch;
			continue;
		}

		// Basic punctuation
		if (!isDevanagari(ch)) {
			out += ch;
			continue;
		}

		// Handle common conjuncts (2-char sequences) first
		const two = ch + peek(i + 1);
		if (cons[two]) {
			out += cons[two] + "a";
			i += 1;
			continue;
		}

		if (vowels[ch]) {
			out += vowels[ch];
			continue;
		}

		if (cons[ch]) {
			let base = cons[ch];
			const next = peek(i + 1);

			if (next === virama) {
				out += base;
				i += 1;
				continue;
			}

			if (matras[next]) {
				out += base + matras[next];
				i += 1;
				continue;
			}

			// Inherent vowel
			out += base + "a";
			continue;
		}

		if (ch === anusvara || ch === chandrabindu) {
			out += "n";
			continue;
		}
		if (ch === visarga) {
			out += "h";
			continue;
		}

		// Default: skip unknown marks
	}

	// Cleanup spaces
	out = out.replace(/\s+/g, " ").trim();

	// Heuristic schwa deletion: drop trailing 'a' if input ends with a consonant
	// (helps: अमित -> amita -> amit)
	if (out.endsWith("a") && /[\u0915-\u0939\u0958-\u095f]$/u.test(s)) {
		out = out.slice(0, -1);
	}

	return out;
}

function toDisplayName(raw) {
	const s = String(raw || "").trim();
	if (!s) return "Customer";
	const latin = isDevanagari(s) ? devanagariToLatin(s) : s;
	const cleaned = latin.replace(/\s+/g, " ").trim();
	if (!cleaned) return "Customer";
	return cleaned
		.split(" ")
		.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(" ");
}

function extractPersonName(raw) {
	const display = toDisplayName(raw);
	if (!display) return "Customer";
	const stop = new Set(
		[
			"paid",
			"pay",
			"payment",
			"received",
			"rs",
			"rupees",
			"rupaye",
			"rupee",
			"paisa",
			"paise",
			"cash",
			"upi",
			"online",
			"udhaar",
			"debt",
			"total",
			"bill",
			// Common romanized artifacts from Hindi speech recognition
			"paida",
			"aaraes",
		]
	);

	const words = display
		.split(" ")
		.map((w) => w.trim())
		.filter(Boolean)
		.filter((w) => !stop.has(w.toLowerCase()));

	if (!words.length) return "Customer";
	// Keep 1-2 tokens for names like "Ramesh Kumar"
	return words.slice(0, 2).join(" ");
}

export { isDevanagari, devanagariToLatin, toDisplayName, extractPersonName };
