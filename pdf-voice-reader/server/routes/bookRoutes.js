const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadBook,
  getBooks,
  getBookById,
  updateBook,
  updateProgress,
  addBookmark,
  removeBookmark,
  deleteBook,
} = require("../controllers/bookController");

router.use(protect);

router.post("/upload", upload.single("pdf"), uploadBook);
router.get("/", getBooks);
router.get("/:id", getBookById);
router.put("/:id", updateBook);
router.put("/:id/progress", updateProgress);
router.post("/:id/bookmarks", addBookmark);
router.delete("/:id/bookmarks/:bookmarkId", removeBookmark);
router.delete("/:id", deleteBook);

module.exports = router;
