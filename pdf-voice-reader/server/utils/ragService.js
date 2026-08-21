const { extractTextByPage } = require("./pdfText");
const { splitIntoChunks, embedTextsBatched, embedText } = require("./embeddings");
const Chunk = require("../models/Chunk");
const Book = require("../models/Book");

// Runs the full RAG indexing pipeline for a book: extract text per page,
// split into overlapping chunks (tagged with their page number), embed
// each chunk, and store them. Updates the book's indexingStatus when done.
// This is meant to run in the background (not awaited by the upload
// response) since it can take a while for large books.
async function indexBookForRAG(bookId, filePath) {
  try {
    const pages = await extractTextByPage(filePath);

    // Build chunks per page so each chunk can be tagged with its page number.
    // (Chunking per-page rather than across the whole book keeps the page
    // tag accurate — a chunk never spans two pages.)
    const chunkRecords = [];
    pages.forEach((pageText, idx) => {
      const pageNum = idx + 1;
      if (!pageText || !pageText.trim()) return;
      const pageChunks = splitIntoChunks(pageText, 500, 100);
      pageChunks.forEach((text) => {
        if (text.trim().length > 20) {
          chunkRecords.push({ text, page: pageNum });
        }
      });
    });

    if (chunkRecords.length === 0) {
      await Book.findByIdAndUpdate(bookId, { indexingStatus: "failed" });
      return;
    }

    const embeddings = await embedTextsBatched(chunkRecords.map((c) => c.text));

    const docs = chunkRecords.map((c, i) => ({
      book: bookId,
      text: c.text,
      page: c.page,
      chunkIndex: i,
      embedding: embeddings[i],
    }));

    await Chunk.insertMany(docs);
    await Book.findByIdAndUpdate(bookId, { indexingStatus: "ready" });
  } catch (err) {
    console.error(`RAG indexing failed for book ${bookId}:`, err.message);
    await Book.findByIdAndUpdate(bookId, { indexingStatus: "failed" });
  }
}

// Given a natural-language query, finds the most relevant chunks from a
// specific book using MongoDB Atlas Vector Search.
async function retrieveRelevantChunks(bookId, query, topK = 5) {
  const queryEmbedding = await embedText(query);

  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: "chunk_vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: topK,
        filter: { book: bookId },
      },
    },
    {
      $project: {
        text: 1,
        page: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results;
}

module.exports = { indexBookForRAG, retrieveRelevantChunks };