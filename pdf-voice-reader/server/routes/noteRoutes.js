const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getNotesForBook,
  createNote,
  updateNote,
  deleteNote,
} = require("../controllers/noteController");

router.use(protect);
router.get("/book/:bookId", getNotesForBook);
router.post("/", createNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;
