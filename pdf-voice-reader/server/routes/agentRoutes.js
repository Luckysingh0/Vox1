const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { chatWithAgent } = require("../controllers/agentController");

router.use(protect);
router.post("/chat", chatWithAgent);

module.exports = router;
