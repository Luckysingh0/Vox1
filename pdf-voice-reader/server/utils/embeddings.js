const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const EMBEDDING_MODEL = "gemini-embedding-001";

// Splits text into overlapping word-based chunks. Overlap keeps context
// from being cut off mid-idea at chunk boundaries.
function splitIntoChunks(text, chunkSize = 600, overlap = 100) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlap;
  }

  return chunks;
}

// Generates an embedding vector for a single piece of text. Retries with
// exponential backoff on transient errors (like 503 Service Unavailable),
// which are temporary issues on Google's end rather than real failures —
// without this, one blip during a book's indexing would mark the whole
// book as failed.
async function embedText(text, retries = 3) {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      const isTransient = err?.status === 503 || err?.status === 429 || /unavailable|overloaded/i.test(err?.message || "");
      if (!isTransient || attempt === retries) throw err;
      const backoffMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s...
      console.warn(`Embedding attempt ${attempt + 1} failed (${err.message}), retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

// Embeds many texts, with simple batching + delay to stay within free-tier
// rate limits (Gemini's free tier allows a limited number of requests per
// minute). This runs once per book upload, so a bit of extra time is fine.
async function embedTextsBatched(texts, { batchSize = 5, delayMs = 1200 } = {}) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(batch.map((t) => embedText(t)));
    embeddings.push(...batchEmbeddings);
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return embeddings;
}

module.exports = { splitIntoChunks, embedText, embedTextsBatched };