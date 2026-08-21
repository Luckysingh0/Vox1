const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const Book = require("../models/Book");
const Note = require("../models/Note");
const Chunk = require("../models/Chunk");
const { indexBookForRAG } = require("../utils/ragService");

// @route POST /api/books/upload
// Handles the actual PDF file upload, extracts page count
const uploadBook = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No PDF file uploaded" });

    const { title, author, folder } = req.body;
    const filePath = req.file.path;

    // Extract total pages using pdf-parse
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const totalPages = pdfData.numpages;

    const book = await Book.create({
      title: title || req.file.originalname.replace(".pdf", ""),
      author: author || "Unknown",
      user: req.user._id,
      folder: folder || null,
      fileUrl: `/uploads/pdfs/${req.file.filename}`,
      totalPages,
      chapters: [], // user or auto-detection can add these later
    });

    // Kick off RAG indexing (chunking + embedding) in the background —
    // don't make the user wait for this before they can open the book.
    indexBookForRAG(book._id, filePath).catch((err) =>
      console.error("Background RAG indexing error:", err.message)
    );

    res.status(201).json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route GET /api/books  (optionally ?folder=<id> or ?folder=none)
const getBooks = async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.folder === "none") {
    filter.folder = null;
  } else if (req.query.folder) {
    filter.folder = req.query.folder;
  }
  const books = await Book.find(filter).sort({ updatedAt: -1 });
  res.json(books);
};

// @route GET /api/books/:id
const getBookById = async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, user: req.user._id });
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json(book);
};

// @route PUT /api/books/:id  (title, author, folder, chapters)
const updateBook = async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, user: req.user._id });
  if (!book) return res.status(404).json({ message: "Book not found" });

  const { title, author, folder, chapters } = req.body;
  if (title !== undefined) book.title = title;
  if (author !== undefined) book.author = author;
  if (folder !== undefined) book.folder = folder;
  if (chapters !== undefined) book.chapters = chapters;

  await book.save();
  res.json(book);
};

// @route PUT /api/books/:id/progress  (update last read page)
const updateProgress = async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, user: req.user._id });
  if (!book) return res.status(404).json({ message: "Book not found" });

  book.lastReadPage = req.body.page ?? book.lastReadPage;
  await book.save();
  res.json(book);
};

// @route POST /api/books/:id/bookmarks
const addBookmark = async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, user: req.user._id });
  if (!book) return res.status(404).json({ message: "Book not found" });

  book.bookmarks.push({ page: req.body.page, label: req.body.label || "" });
  await book.save();
  res.status(201).json(book.bookmarks);
};

// @route DELETE /api/books/:id/bookmarks/:bookmarkId
const removeBookmark = async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, user: req.user._id });
  if (!book) return res.status(404).json({ message: "Book not found" });

  book.bookmarks = book.bookmarks.filter(
    (b) => b._id.toString() !== req.params.bookmarkId
  );
  await book.save();
  res.json(book.bookmarks);
};

// @route DELETE /api/books/:id
const deleteBook = async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, user: req.user._id });
  if (!book) return res.status(404).json({ message: "Book not found" });

  // Delete the actual PDF file from disk
  const filePath = path.join(__dirname, "..", book.fileUrl);
  fs.unlink(filePath, (err) => {
    if (err) console.warn("Could not delete file:", err.message);
  });

  await Note.deleteMany({ book: book._id });
  await Chunk.deleteMany({ book: book._id });
  await book.deleteOne();
  res.json({ message: "Book deleted" });
};

module.exports = {
  uploadBook,
  getBooks,
  getBookById,
  updateBook,
  updateProgress,
  addBookmark,
  removeBookmark,
  deleteBook,
};