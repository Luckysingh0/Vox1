const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    page: { type: Number, required: true }, // page number this chapter starts on
  },
  { _id: false }
);

const bookmarkSchema = new mongoose.Schema({
  page: { type: Number, required: true },
  label: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, default: "Unknown" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null }, // null = uncategorized
    fileUrl: { type: String, required: true }, // path to PDF on server
    coverUrl: { type: String, default: "" }, // optional generated/placeholder cover
    totalPages: { type: Number, default: 0 },
    chapters: [chapterSchema],
    bookmarks: [bookmarkSchema],
    lastReadPage: { type: Number, default: 1 },
    // Tracks whether this book's text has been chunked + embedded for RAG.
    // "pending" until upload finishes processing, then "ready" or "failed".
    indexingStatus: {
      type: String,
      enum: ["pending", "ready", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);