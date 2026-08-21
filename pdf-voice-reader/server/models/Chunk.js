const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
  text: { type: String, required: true },
  page: { type: Number, required: true },
  chunkIndex: { type: Number, required: true }, // order within the book
  embedding: {
    type: [Number],
    required: true,
  },
});

module.exports = mongoose.model("Chunk", chunkSchema);