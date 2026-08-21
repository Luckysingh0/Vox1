import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { usePdfRenderer } from "../hooks/usePdfRenderer";
import { useVoiceAgent } from "../hooks/useVoiceAgent";
import PdfPage from "../components/PdfPage";
import ChapterSidebar from "../components/ChapterSidebar";
import NotesPanel from "../components/NotesPanel";
import VoiceAgentBar from "../components/VoiceAgentBar";
import { ArrowLeft, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Moon, Sun, ZoomIn, ZoomOut } from "lucide-react";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  "/api",
  ""
);

// Two visual themes for the Reader page only. "light" is the standard
// cream/accent look used elsewhere in the app; "dreamy" is the dark
// mystical look used on Home/Library. Kept as a lookup table so the JSX
// below stays readable instead of a wall of ternaries.
const THEMES = {
  light: {
    page: "bg-cream-100",
    header: "bg-cream-100",
    headerBtn: "text-ink-500 hover:bg-white",
    title: "text-ink-900",
    badgePending: "bg-white border border-cream-300 text-ink-500",
    badgeFailed: "bg-white border border-cream-300 text-ink-400",
    badgeDot: "bg-accent-500",
    pageNav: "bg-white border border-cream-300 text-ink-600",
    pageNavBtn: "hover:bg-cream-100",
    bookmarkOn: "bg-accent-100 text-accent-700",
    bookmarkOff: "text-ink-500 hover:bg-white",
    panel: "bg-white border border-cream-300",
    loadingText: "text-ink-400",
    toggleBtn: "bg-white border border-cream-300 text-ink-500 hover:bg-cream-50",
  },
  dreamy: {
    page: "bg-[radial-gradient(ellipse_at_top,_#241b3d_0%,_#140f24_45%,_#0a0714_100%)]",
    header: "bg-transparent",
    headerBtn: "text-amber-100/60 hover:bg-white/10",
    title: "text-amber-50",
    badgePending: "bg-white/5 border border-amber-100/15 text-amber-100/70 backdrop-blur-sm",
    badgeFailed: "bg-white/5 border border-amber-100/15 text-amber-100/40 backdrop-blur-sm",
    badgeDot: "bg-amber-300",
    pageNav: "bg-white/5 border border-amber-100/15 text-amber-100 backdrop-blur-sm",
    pageNavBtn: "hover:bg-white/10",
    bookmarkOn: "bg-amber-200/20 text-amber-200",
    bookmarkOff: "text-amber-100/60 hover:bg-white/10",
    panel: "bg-white/5 border border-amber-100/15 backdrop-blur-sm",
    loadingText: "text-amber-100/40",
    toggleBtn: "bg-white/5 border border-amber-100/15 text-amber-100 hover:bg-white/10",
  },
};

export default function Reader() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  // PDF render scale — 1.4 matches the previous fixed default, clamped
  // between 0.6x and 3x so zooming can't render an unusably tiny or huge page.
  const [zoom, setZoom] = useState(1.4);
  const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)));
  const resetZoom = () => setZoom(1.4);
  const [notes, setNotes] = useState([]);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("readerTheme") || "light"
  );
  const t = THEMES[theme];

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dreamy" : "light";
      localStorage.setItem("readerTheme", next);
      return next;
    });
  };
  // Bumped whenever the agent calls highlight_text — PdfPage watches this
  // to lock its current hover/selection highlight in place.
  const [highlightLockTrigger, setHighlightLockTrigger] = useState(0);
  // Latest hovered text is kept in a ref (not state) so the voice agent can
  // read the "current" value at the moment of speaking, without needing to
  // re-render or re-create the agent hook on every mouse move.
  const hoveredTextRef = useRef("");
  // Explicitly selected text — takes priority over hover when present.
  // Cleared whenever the page changes so a stale selection from a
  // previous page doesn't get used as context.
  const selectedTextRef = useRef("");
  // Scroll container + a guard so we only trigger one page change per
  // "reaching the edge" — reset whenever the page (and thus scroll
  // position) changes.
  const scrollContainerRef = useRef(null);
  const scrollNavGuardRef = useRef(false);

  const fileUrl = book ? `${API_ORIGIN}${book.fileUrl}` : null;
  const { numPages, loading, error, detectedOutline, renderPage, getTextNearPoint, getFullPageText } =
    usePdfRenderer(fileUrl);

  const loadBook = useCallback(() => {
    return api.get(`/books/${bookId}`).then((res) => {
      setBook(res.data);
      return res.data;
    });
  }, [bookId]);

  const loadNotes = useCallback(() => {
    return api.get(`/notes/book/${bookId}`).then((res) => setNotes(res.data));
  }, [bookId]);

  useEffect(() => {
    loadBook().then((data) => {
      setCurrentPage(data.lastReadPage || 1);
    });
    loadNotes();
  }, [loadBook, loadNotes]);

  // Store the latest hovered text — this is what the voice agent "sees"
  // when the user asks about the section near their mouse.
  const handleHoverText = useCallback((data) => {
    hoveredTextRef.current = data?.text || "";
  }, []);

  // Store explicitly selected text — this takes priority over hover.
  const handleTextSelected = useCallback((data) => {
    selectedTextRef.current = data?.text || "";
  }, []);

  // Clear any stale selection when the page changes
  useEffect(() => {
    selectedTextRef.current = "";
  }, [currentPage]);

  // Save reading progress when the page changes (debounced-ish via effect)
  useEffect(() => {
    if (!book) return;
    const t = setTimeout(() => {
      api.put(`/books/${bookId}/progress`, { page: currentPage }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [currentPage, book, bookId]);

  const lastScrollTopRef = useRef(0);
  const scrollSettledRef = useRef(false);

  const goToPage = (p, opts = {}) => {
    if (p < 1 || (numPages && p > numPages)) return;
    const cameFromBelow = opts.enterAtBottom;
    setCurrentPage(p);
    scrollNavGuardRef.current = false;
    scrollSettledRef.current = false;

    const positionScroll = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const targetTop = cameFromBelow ? el.scrollHeight - el.clientHeight : 0;
      el.scrollTo({ top: targetTop });
      lastScrollTopRef.current = targetTop;
      setTimeout(() => {
        scrollSettledRef.current = true;
      }, 250);
    };

    // Entering from below needs the new page's canvas to finish rendering
    // first so scrollHeight is accurate — a short delay covers that;
    // entering at top doesn't depend on render size, so it can happen
    // right away via requestAnimationFrame.
    if (cameFromBelow) {
      setTimeout(positionScroll, 150);
    } else {
      requestAnimationFrame(positionScroll);
    }
  };

  // Advances to the next page when scrolling past the bottom edge, and
  // back to the previous page when scrolling up past the top edge — so
  // reading feels continuous in both directions without needing the
  // arrow buttons. A short "settled" window after each page load prevents
  // the reset-to-top jump from being mistaken for a real upward scroll.
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || scrollNavGuardRef.current || !scrollSettledRef.current) {
      if (el) lastScrollTopRef.current = el.scrollTop;
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollingUp = scrollTop < lastScrollTopRef.current;
    const scrollingDown = scrollTop > lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    // If the page content is shorter than (or equal to) the visible area,
    // there's nothing to scroll — scrollTop stays 0 no matter what, which
    // would otherwise make "near bottom" trivially true and fire on every
    // scroll attempt. Require the container to actually be scrollable.
    const isScrollable = scrollHeight > clientHeight + 4;
    const nearBottom = isScrollable && scrollTop + clientHeight >= scrollHeight - 40;
    const nearTop = scrollTop <= 4;

    if (isScrollable && nearBottom && scrollingDown && currentPage < numPages) {
      scrollNavGuardRef.current = true;
      goToPage(currentPage + 1);
    } else if (nearTop && scrollingUp && currentPage > 1) {
      scrollNavGuardRef.current = true;
      goToPage(currentPage - 1, { enterAtBottom: true });
    }
  };

  // Fallback for when the page content is shorter than the viewport (so
  // there's nothing to actually scroll, and handleScroll's scrollTop-based
  // detection never fires) — a wheel gesture still advances/goes back a page.
  const handleWheel = (e) => {
    const el = scrollContainerRef.current;
    if (!el || scrollNavGuardRef.current || !scrollSettledRef.current) return;
    const isScrollable = el.scrollHeight > el.clientHeight + 4;
    if (isScrollable) return; // normal scroll handling covers this case

    if (e.deltaY > 10 && currentPage < numPages) {
      scrollNavGuardRef.current = true;
      goToPage(currentPage + 1);
    } else if (e.deltaY < -10 && currentPage > 1) {
      scrollNavGuardRef.current = true;
      goToPage(currentPage - 1, { enterAtBottom: true });
    }
  };

  const isCurrentPageBookmarked = book?.bookmarks?.some((b) => b.page === currentPage);

  const handleToggleBookmark = async () => {
    if (!book) return;
    if (isCurrentPageBookmarked) {
      const bm = book.bookmarks.find((b) => b.page === currentPage);
      await api.delete(`/books/${bookId}/bookmarks/${bm._id}`);
    } else {
      await api.post(`/books/${bookId}/bookmarks`, { page: currentPage });
    }
    loadBook();
  };

  const handleRemoveBookmark = async (bookmarkId) => {
    await api.delete(`/books/${bookId}/bookmarks/${bookmarkId}`);
    loadBook();
  };

  const handleAddChapter = async ({ title, page }) => {
    const updatedChapters = [...(book.chapters || []), { title, page }].sort(
      (a, b) => a.page - b.page
    );
    const res = await api.put(`/books/${bookId}`, { chapters: updatedChapters });
    setBook(res.data);
  };

  const handleAddNote = async (content) => {
    await api.post("/notes", { book: bookId, page: currentPage, content, source: "user" });
    loadNotes();
  };

  const handleDeleteNote = async (noteId) => {
    await api.delete(`/notes/${noteId}`);
    loadNotes();
  };

  const handleEditNote = async (noteId, content) => {
    await api.put(`/notes/${noteId}`, { content });
    loadNotes();
  };

  // Executes whatever tool calls the agent decided to make.
  const handleToolCalls = useCallback(
    (toolCalls) => {
      for (const call of toolCalls) {
        if (call.name === "turn_page") {
          const { direction, pageNumber } = call.input;
          if (direction === "next") goToPage(currentPage + 1);
          else if (direction === "previous") goToPage(currentPage - 1);
          else if (direction === "specific" && pageNumber) goToPage(pageNumber);
        } else if (call.name === "save_to_notes") {
          loadNotes(); // the note was already saved server-side
        } else if (call.name === "add_bookmark") {
          loadBook(); // refresh so the new bookmark shows in the sidebar
        } else if (call.name === "highlight_text") {
          setHighlightLockTrigger((n) => n + 1); // tells PdfPage to lock its current highlight
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, loadNotes, loadBook]
  );

  // The agent gets two things every time: a "focused" text (selection takes
  // priority, then hover, then nothing) telling it exactly what the user
  // pointed at, AND the full current page text as surrounding context —
  // so a single selected word/line still comes with enough context to
  // make sense of, rather than being explained in isolation.
  const getContextText = useCallback(() => {
    const pageText = getFullPageText(currentPage);
    if (selectedTextRef.current) {
      return { text: selectedTextRef.current, mode: "selection", pageText };
    }
    if (hoveredTextRef.current) {
      return { text: hoveredTextRef.current, mode: "hover", pageText };
    }
    return { text: pageText, mode: "page", pageText };
  }, [currentPage, getFullPageText]);

  const voiceAgent = useVoiceAgent({
    bookId,
    bookTitle: book?.title,
    currentPage,
    getContextText,
    onToolCalls: handleToolCalls,
  });

  // While the book is still being indexed for RAG (chunking + embedding
  // happens in the background after upload), poll every few seconds so the
  // "Indexing..." badge updates to "Ready" without needing a page refresh.
  useEffect(() => {
    if (book?.indexingStatus !== "pending") return;
    const interval = setInterval(() => {
      loadBook();
    }, 4000);
    return () => clearInterval(interval);
  }, [book?.indexingStatus, loadBook]);

  return (
    <div className={`h-screen flex flex-col ${t.page}`}>
      {/* Top bar */}
      <header className={`flex items-center gap-4 px-6 py-3.5 shrink-0 ${t.header}`}>
        <Link
          to="/library"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${t.headerBtn}`}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className={`font-serif text-lg truncate flex-1 ${t.title}`}>
          {book?.title || "Loading..."}
        </h1>

        {book?.indexingStatus === "pending" && (
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium shrink-0 ${t.badgePending}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${t.badgeDot}`} />
            Indexing for full-context Q&A...
          </span>
        )}
        {book?.indexingStatus === "failed" && (
          <span className={`px-3 py-1.5 rounded-full text-[11px] font-medium shrink-0 ${t.badgeFailed}`}>
            Full-book search unavailable
          </span>
        )}

        {numPages > 0 && (
          <div className={`flex items-center gap-1 rounded-full px-1.5 py-1 text-sm ${t.pageNav}`}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition ${t.pageNavBtn}`}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="tabular-nums text-xs px-1 min-w-[52px] text-center">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition ${t.pageNavBtn}`}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {numPages > 0 && (
          <div className={`flex items-center gap-1 rounded-full px-1.5 py-1 text-sm ${t.pageNav}`}>
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.6}
              className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition ${t.pageNavBtn}`}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={resetZoom}
              className="tabular-nums text-xs px-1 min-w-[44px] text-center hover:underline"
              title="Reset zoom"
            >
              {Math.round((zoom / 1.4) * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoom >= 3}
              className={`w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition ${t.pageNavBtn}`}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        )}

        <button
          onClick={handleToggleBookmark}
          disabled={!book}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
            isCurrentPageBookmarked ? t.bookmarkOn : t.bookmarkOff
          }`}
          title={isCurrentPageBookmarked ? "Remove bookmark" : "Bookmark this page"}
        >
          {isCurrentPageBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>

        <button
          onClick={toggleTheme}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${t.toggleBtn}`}
          title={theme === "light" ? "Switch to dreamy mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden px-3 pb-3 gap-3">
        {/* Left sidebar - chapters + bookmarks */}
        <aside className={`w-60 shrink-0 rounded-2xl p-4 overflow-y-auto thin-scrollbar ${t.panel}`}>
          {book && (
            <ChapterSidebar
              detectedOutline={detectedOutline}
              savedChapters={book.chapters}
              bookmarks={book.bookmarks}
              currentPage={currentPage}
              onJumpToPage={goToPage}
              onAddChapter={handleAddChapter}
              onRemoveBookmark={handleRemoveBookmark}
              theme={theme}
            />
          )}
        </aside>

        {/* Center - PDF viewer */}
        <main className={`flex-1 flex flex-col overflow-hidden rounded-2xl ${t.panel}`}>
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            className="flex-1 overflow-y-auto py-6 px-4 thin-scrollbar"
          >
            {loading && (
              <p className={`text-center text-sm mt-20 ${t.loadingText}`}>Loading PDF...</p>
            )}
            {error && (
              <p className="text-center text-red-400 text-sm mt-20">
                Couldn't load PDF: {error}
              </p>
            )}
            {!loading && !error && numPages > 0 && (
              <PdfPage
                key={currentPage}
                pageNum={currentPage}
                renderPage={renderPage}
                getTextNearPoint={getTextNearPoint}
                onHoverText={handleHoverText}
                onTextSelected={handleTextSelected}
                highlightLockTrigger={highlightLockTrigger}
                zoom={zoom}
              />
            )}
          </div>
          <VoiceAgentBar voiceAgent={voiceAgent} theme={theme} />
        </main>

        {/* Right sidebar - notes workspace */}
        <aside className={`w-80 shrink-0 rounded-2xl p-4 overflow-y-auto thin-scrollbar flex flex-col ${t.panel}`}>
          <NotesPanel
            notes={notes}
            currentPage={currentPage}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onEditNote={handleEditNote}
            apiOrigin={API_ORIGIN}
            theme={theme}
          />
        </aside>
      </div>
    </div>
  );
}
