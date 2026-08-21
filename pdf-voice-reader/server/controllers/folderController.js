const Folder = require("../models/Folder");
const Book = require("../models/Book");

// @route GET /api/folders
const getFolders = async (req, res) => {
  const folders = await Folder.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(folders);
};

// @route POST /api/folders
const createFolder = async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ message: "Folder name is required" });

  const folder = await Folder.create({ name, color, user: req.user._id });
  res.status(201).json(folder);
};

// @route PUT /api/folders/:id
const updateFolder = async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user._id });
  if (!folder) return res.status(404).json({ message: "Folder not found" });

  folder.name = req.body.name ?? folder.name;
  folder.color = req.body.color ?? folder.color;
  await folder.save();
  res.json(folder);
};

// @route DELETE /api/folders/:id
const deleteFolder = async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user._id });
  if (!folder) return res.status(404).json({ message: "Folder not found" });

  // Unassign books from this folder instead of deleting them
  await Book.updateMany({ folder: folder._id }, { $set: { folder: null } });
  await folder.deleteOne();
  res.json({ message: "Folder deleted" });
};

module.exports = { getFolders, createFolder, updateFolder, deleteFolder };
