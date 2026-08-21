const Groq = require("groq-sdk");
const Note = require("../models/Note");
const Book = require("../models/Book");
const { retrieveRelevantChunks } = require("../utils/ragService");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Retries a Groq API call with exponential backoff on transient errors
// (503/429/rate-limit) — these are temporary issues, not real failures.
async function withRetry(fn, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const isTransient =
        status === 503 || status === 429 || /rate.?limit|unavailable|overloaded/i.test(err?.message || "");
      if (!isTransient || attempt === retries) throw err;
      const backoffMs = 1000 * Math.pow(2, attempt);
      console.warn(`Groq call attempt ${attempt + 1} failed (${err.message}), retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

// Tool (function) definitions the agent can call, in OpenAI/Groq's function
// calling format. Each maps to something the frontend or backend actually
// does — the model picks which one(s) to use based on what the user asked.
const tools = [
  {
    type: "function",
    function: {
      name: "explain_section",
      description:
        "Explain a piece of text from the book in simple, clear terms. Use this when the user asks to explain, clarify, or elaborate on something — especially the text near their mouse cursor.",
      parameters: {
        type: "object",
        properties: {
          explanation: {
            type: "string",
            description: "A clear, conversational explanation of the section, suitable for being spoken aloud.",
          },
        },
        required: ["explanation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "turn_page",
      description:
        "Navigate to a different page in the book. Use when the user asks to go to the next/previous page or a specific page number.",
      parameters: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: ["next", "previous", "specific"],
            description: "Which way to navigate.",
          },
          pageNumber: {
            type: "number",
            description: "Required only if direction is 'specific' — the exact page to go to.",
          },
        },
        required: ["direction"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_to_notes",
      description:
        "Save the current explanation to the user's notes for this book and page. Use when the user asks to save, note this down, or remember this.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The text content to save as a note." },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_bookmark",
      description:
        "Bookmark the current page (or a specific page) so the user can jump back to it later. Use when the user asks to bookmark this page, save this spot, or mark this page.",
      parameters: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description:
              "A short optional label for the bookmark describing what's here (e.g. 'the argument about power'). Leave empty if the user didn't specify one.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "highlight_text",
      description:
        "Visually highlight the text the user is currently pointing at (selected or hovered) on the page. Use when the user asks to highlight this, mark this text, or color this in — this is a visual-only action, separate from bookmarking or saving a note.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `You are a friendly, knowledgeable reading companion helping someone read a book in real time.
You can see the page they're currently on, the text near their mouse cursor when they hover over something, the user's existing bookmarks, and relevant passages retrieved from anywhere in the book (not just the current page).
Keep your spoken replies conversational, warm, and concise (2-4 sentences unless asked for more) — they will be read aloud via text-to-speech.
Always reply in the same language the user asked in (e.g. if they asked in Hindi, reply in Hindi; if in English, reply in English).
When the user asks you to explain something, use the explain_section tool.
When the user's question is vague (e.g. just "explain this" or "what does this mean" without naming a topic), briefly confirm what text you're looking at before explaining it — e.g. "Looking at where your cursor is, the part about..." or "The line you selected says..." — so they know you're responding to the right spot. Skip this confirmation when they named the topic explicitly (e.g. "explain photosynthesis").
When they want to move pages, use turn_page.
When they want something saved as a note, use save_to_notes.
When they want to bookmark the current page or ask what's in their bookmarks, use add_bookmark to create one, or just answer directly from the existing bookmarks list you're given — you don't need a tool to read them, they're already in your context.
When they ask to highlight, mark, or color the text they're pointing at, use highlight_text.
You can use multiple tools together if it makes sense (e.g. explain, then save).

Answering priority: always check the retrieved passages and current page first — if they answer the question, base your answer on them and answer normally, as if it's common ground between you and the reader.
If the retrieved passages only partially answer the question (e.g. you can tell WHAT is being referred to but not exactly WHO, or vice versa), say clearly what you do know and what's unclear from what you've seen — don't guess at the missing part, and don't pad the answer with filler like "keep reading to find out." Just state what's known and what isn't.
If the retrieved passages do NOT contain the answer at all, you may use your own general knowledge to answer — but you must clearly flag this, e.g. start with "This book doesn't cover that directly, but from general knowledge..." so the reader knows it's not from the book itself. Never blend book content and outside knowledge without distinguishing them.
If no tool clearly applies, just respond normally with helpful text.`;

// @route POST /api/agent/chat
// Body: { transcript, bookId, currentPage, hoveredText, contextMode, bookTitle }
const chatWithAgent = async (req, res) => {
  try {
    const { transcript, bookId, currentPage, hoveredText, contextMode, pageText, bookTitle } = req.body;
    if (!transcript) {
      return res.status(400).json({ message: "transcript is required" });
    }

    // Pull relevant passages from anywhere in the book (RAG). If indexing
    // hasn't finished yet or fails, we just proceed without it.
    let retrievedContext = "";
    try {
      const chunks = await retrieveRelevantChunks(bookId, transcript, 8);
      if (chunks.length > 0) {
        retrievedContext = chunks.map((c) => `[Page ${c.page}]: ${c.text}`).join("\n\n");
      }
    } catch (err) {
      console.warn("RAG retrieval skipped:", err.message);
    }

    const focusLabel =
      contextMode === "selection"
        ? "Text the user explicitly selected/highlighted (this is exactly what they're asking about — but use the surrounding page text below for context)"
        : contextMode === "hover"
        ? "Text near the user's mouse cursor right now (an ambient hint, not necessarily exact — use the surrounding page text below for context)"
        : "No specific selection or hover — the user is asking about the page generally";

    const showPageSeparately = contextMode === "selection" || contextMode === "hover";

    let bookmarksContext = "(none)";
    try {
      const book = await Book.findById(bookId).select("bookmarks");
      if (book?.bookmarks?.length > 0) {
        bookmarksContext = book.bookmarks
          .map((b) => `Page ${b.page}${b.label ? ` — "${b.label}"` : ""}`)
          .join("; ");
      }
    } catch (err) {
      console.warn("Could not fetch bookmarks:", err.message);
    }

    const contextMessage = `Book: "${bookTitle || "Unknown"}"
Current page: ${currentPage || "unknown"}
User's existing bookmarks: ${bookmarksContext}
${focusLabel}: "${hoveredText || "(none available)"}"
${showPageSeparately ? `\nFull surrounding page text (for context around the focused text above):\n"${pageText || "(not available)"}"\n` : ""}
Relevant passages retrieved from across the book:
${retrievedContext || "(none found)"}

User said: "${transcript}"`;

    const completion = await withRetry(() =>
      groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextMessage },
        ],
        tools,
        tool_choice: "auto",
      })
    );

    const choice = completion.choices[0];
    const message = choice.message;

    // Collect any tool calls the model made, plus its plain text (if any)
    const rawToolCalls = message.tool_calls || [];
    const toolCalls = rawToolCalls.map((tc) => ({
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments || "{}"),
    }));
    const replyText = message.content || "";

    // Handle save_to_notes and add_bookmark server-side immediately so
    // they persist without needing another round-trip from the frontend.
    for (const call of toolCalls) {
      if (call.name === "save_to_notes" && bookId) {
        await Note.create({
          book: bookId,
          user: req.user._id,
          page: currentPage || 1,
          content: call.input.content,
          source: "agent",
        });
      } else if (call.name === "add_bookmark" && bookId) {
        const book = await Book.findById(bookId);
        if (book) {
          const alreadyBookmarked = book.bookmarks.some((b) => b.page === (currentPage || 1));
          if (!alreadyBookmarked) {
            book.bookmarks.push({ page: currentPage || 1, label: call.input.label || "" });
            await book.save();
          }
        }
      }
    }

    // Build the spoken reply: prefer an explain_section explanation if present,
    // otherwise fall back to whatever plain text the model produced.
    const explainCall = toolCalls.find((c) => c.name === "explain_section");
    const spokenReply = explainCall?.input?.explanation || replyText || "Done.";

    res.json({
      reply: spokenReply,
      toolCalls,
    });
  } catch (err) {
    console.error("Agent error:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { chatWithAgent };