let Anthropic;
try {
  // Optional dependency: only needed if you have an API key.
  // Offline mode works without this.
  // eslint-disable-next-line global-require
  Anthropic = require("@anthropic-ai/sdk");
} catch (_) {
  Anthropic = null;
}

const SYSTEM_PROMPT =
  'Extract from Hindi transaction. Return ONLY JSON: { "total": number, "cash": number, "upi": number, "udhaar": number }. No explanation.';

function safeNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[₹,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSimpleNumberWordsToInt(words) {
  // Handles common Hindi/Hinglish: "baara"(12), "chaar"(4), "sau"(100), "hazaar"(1000)
  const base = {
    zero: 0,
    ek: 1,
    aik: 1,
    one: 1,
    do: 2,
    two: 2,
    teen: 3,
    tin: 3,
    three: 3,
    chaar: 4,
    char: 4,
    four: 4,
    paanch: 5,
    panch: 5,
    five: 5,
    chhe: 6,
    che: 6,
    six: 6,
    saat: 7,
    seven: 7,
    aath: 8,
    ath: 8,
    eight: 8,
    nau: 9,
    nine: 9,
    das: 10,
    ten: 10,
    gyarah: 11,
    gyaarah: 11,
    eleven: 11,
    barah: 12,
    baara: 12,
    baarah: 12,
    twelve: 12,
    terah: 13,
    thirteen: 13,
    chaudah: 14,
    fourteen: 14,
    pandrah: 15,
    fifteen: 15,
    solah: 16,
    sixteen: 16,
    satrah: 17,
    seventeen: 17,
    atharah: 18,
    attharah: 18,
    eighteen: 18,
    unnis: 19,
    nineteen: 19,
    bees: 20,
    bis: 20,
    twenty: 20,
  };

  const tokens = words
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter(Boolean);

  // Look for patterns like: "baara sau" => 12*100
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const a = base[tokens[i]];
    const b = tokens[i + 1];
    if (Number.isFinite(a) && (b === "sau" || b === "sauu")) return a * 100;
    if (Number.isFinite(a) && (b === "hazaar" || b === "hazar" || b === "thousand")) return a * 1000;
  }

  // Single-token number words
  for (const t of tokens) {
    if (Number.isFinite(base[t])) return base[t];
  }

  return null;
}

function extractAmountNearKeyword(text, keywordRegex) {
  // Find the first occurrence of keyword and look ahead a bit for amount.
  const match = keywordRegex.exec(text);
  if (!match) return null;

  const lookahead = text.slice(match.index, match.index + 40);
  const digitMatch = lookahead.match(/(\d+(?:\.\d+)?)/);
  if (digitMatch) return safeNumber(digitMatch[1]);

  const wordTokens = lookahead.split(" ").slice(0, 6);
  const wordNumber = parseSimpleNumberWordsToInt(wordTokens);
  if (wordNumber != null) return wordNumber;

  return null;
}

function offlineParseTranscript(transcript) {
  const text = normalizeText(transcript);

  // Keywords
  const total =
    extractAmountNearKeyword(text, /(total|bill|billed|amount|kul|pura|poora)/g) ??
    extractAmountNearKeyword(text, /(total|bill|amount)/g);
  const cash = extractAmountNearKeyword(text, /(cash|nakad|nagadh|nagad)/g);
  const upi = extractAmountNearKeyword(text, /(upi|gpay|phonepe|paytm|online)/g);

  // Udhaar is often said as "baaki udhaar" or "remaining udhaar"
  let udhaar = extractAmountNearKeyword(text, /(udhaar|udharr|credit|baaki|baaki\s+udhaar|remaining)/g);

  const result = {
    total: safeNumber(total),
    cash: safeNumber(cash),
    upi: safeNumber(upi),
    udhaar: safeNumber(udhaar),
  };

  // If udhaar not explicitly numeric, infer: udhaar = total - cash - upi
  if (!result.udhaar && result.total) {
    const inferred = result.total - result.cash - result.upi;
    result.udhaar = inferred > 0 ? inferred : 0;
  }

  return result;
}

async function parseTranscript(transcript) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const forceOffline = String(process.env.VOICE_PARSER_MODE || "").toLowerCase() === "offline";

  if (forceOffline || !apiKey || !Anthropic) {
    return offlineParseTranscript(transcript);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-haiku-20240307",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: String(transcript || "") }],
    });

    const jsonResponse = msg?.content?.[0]?.text;
    const parsed = JSON.parse(jsonResponse);
    return {
      total: safeNumber(parsed?.total),
      cash: safeNumber(parsed?.cash),
      upi: safeNumber(parsed?.upi),
      udhaar: safeNumber(parsed?.udhaar),
    };
  } catch (error) {
    // If Claude fails for any reason, fall back to offline parsing.
    console.error("Claude parse failed, using offline parser:", error?.message || error);
    return offlineParseTranscript(transcript);
  }
}

module.exports = { parseTranscript };
