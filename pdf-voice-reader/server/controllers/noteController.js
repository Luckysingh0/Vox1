const Note = require("../models/Note");

// @route GET /api/notes/book/:bookId
const getNotesForBook = async (req, res) => {
  const notes = await Note.find({ book: req.params.bookId, user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(notes);
};

// @route POST /api/notes
const createNote = async (req, res) => {
  const { book, page, content, imageUrl, source } = req.body;
  if (!book || !content) {
    return res.status(400).json({ message: "book and content are required" });
  }

  const note = await Note.create({
    book,
    page,
    content,
    imageUrl: imageUrl || "",
    source: source || "user",
    user: req.user._id,
  });
  res.status(201).json(note);
};

// @route PUT /api/notes/:id
const updateNote = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });

  note.content = req.body.content ?? note.content;
  note.imageUrl = req.body.imageUrl ?? note.imageUrl;
  await note.save();
  res.json(note);
};

// @route DELETE /api/notes/:id
const deleteNote = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });

  await note.deleteOne();
  res.json({ message: "Note deleted" });
};

module.exports = { getNotesForBook, createNote, updateNote, deleteNote };
