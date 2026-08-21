const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    page: { type: Number, required: true }, // which page this note was created on
    content: { type: String, required: true }, // text content (can include agent explanations)
    imageUrl: { type: String, default: "" }, // if the agent generated a picture for this note
    source: { type: String, enum: ["user", "agent"], default: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
