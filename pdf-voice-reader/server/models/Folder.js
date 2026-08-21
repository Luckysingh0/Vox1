const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    color: { type: String, default: "#6366f1" }, // for UI badge color
  },
  { timestamps: true }
);

module.exports = mongoose.model("Folder", folderSchema);
