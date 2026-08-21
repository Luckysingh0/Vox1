import { useState } from "react";
import { Plus, Bookmark, X, ChevronRight } from "lucide-react";

/**
 * Left sidebar for the Reader page.
 * Shows chapters (auto-detected from the PDF outline, falling back to
 * manually-saved chapters on the book) and bookmarks. Clicking either
 * jumps to that page.
 */
export default function ChapterSidebar({
  detectedOutline,
  savedChapters,
  bookmarks,
  currentPage,
  onJumpToPage,
  onAddChapter,
  onRemoveBookmark,
  theme = "light",
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPage, setNewPage] = useState("");
  const dreamy = theme === "dreamy";

  // Prefer auto-detected outline; fall back to manually saved chapters.
  const chapters = detectedOutline?.length > 0 ? detectedOutline : savedChapters || [];
  const isAutoDetected = detectedOutline?.length > 0;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(newPage, 10);
    if (!newTitle.trim() || !pageNum) return;
    onAddChapter({ title: newTitle.trim(), page: pageNum });
    setNewTitle("");
    setNewPage("");
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chapters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className={`text-xs font-semibold uppercase tracking-wide ${dreamy ? "text-amber-100/40" : "text-ink-400"}`}>
            Chapters
          </p>
          {!isAutoDetected && (
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className={`transition ${dreamy ? "text-amber-100/40 hover:text-amber-200" : "text-ink-400 hover:text-accent-600"}`}
              title="Add chapter manually"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="mb-3 space-y-2">
            <input
              type="text"
              placeholder="Chapter title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              className={`w-full px-2.5 py-1.5 rounded-full text-xs focus:outline-none focus:ring-2 ${
                dreamy
                  ? "border border-amber-100/15 bg-white/5 text-amber-50 placeholder:text-amber-100/30 focus:ring-amber-300/40"
                  : "border border-cream-300 focus:ring-accent-400"
              }`}
            />
            <input
              type="number"
              placeholder="Page number"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              min={1}
              className={`w-full px-2.5 py-1.5 rounded-full text-xs focus:outline-none focus:ring-2 ${
                dreamy
                  ? "border border-amber-100/15 bg-white/5 text-amber-50 placeholder:text-amber-100/30 focus:ring-amber-300/40"
                  : "border border-cream-300 focus:ring-accent-400"
              }`}
            />
            <button
              type="submit"
              className={`w-full py-1.5 rounded-full text-xs font-medium transition ${
                dreamy ? "bg-amber-200 text-[#1a1230] hover:bg-amber-100" : "bg-ink-900 text-white hover:bg-ink-800"
              }`}
            >
              Add
            </button>
          </form>
        )}

        {chapters.length === 0 ? (
          <p className={`text-xs ${dreamy ? "text-amber-100/30" : "text-ink-300"}`}>
            No chapters detected.{" "}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className={`font-medium underline underline-offset-2 ${dreamy ? "text-amber-200" : "text-ink-900"}`}
              >
                Add manually
              </button>
            )}
          </p>
        ) : (
          <nav className="space-y-0.5">
            {chapters.map((ch, i) => {
              const isActive = currentPage === ch.page;
              return (
                <button
                  key={`${ch.page}-${i}`}
                  onClick={() => onJumpToPage(ch.page)}
                  className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-full text-xs text-left transition group ${
                    isActive
                      ? dreamy
                        ? "bg-amber-200/20 text-amber-100 font-medium"
                        : "bg-accent-100 text-ink-900 font-medium"
                      : dreamy
                      ? "text-amber-100/60 hover:bg-white/5"
                      : "text-ink-600 hover:bg-cream-100"
                  }`}
                >
                  <span className="truncate">{ch.title}</span>
                  <ChevronRight
                    size={12}
                    className="shrink-0 opacity-0 group-hover:opacity-40 transition"
                  />
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bookmarks */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${dreamy ? "text-amber-100/40" : "text-ink-400"}`}>
          Bookmarks
        </p>
        {!bookmarks || bookmarks.length === 0 ? (
          <p className={`text-xs ${dreamy ? "text-amber-100/30" : "text-ink-300"}`}>
            No bookmarks yet. Use the bookmark icon in the top bar.
          </p>
        ) : (
          <div className="space-y-0.5">
            {bookmarks.map((bm) => (
              <div
                key={bm._id}
                className={`flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-full text-xs group ${
                  dreamy ? "text-amber-100/60 hover:bg-white/5" : "text-ink-600 hover:bg-cream-100"
                }`}
              >
                <button
                  onClick={() => onJumpToPage(bm.page)}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                >
                  <Bookmark size={11} className={`shrink-0 ${dreamy ? "text-amber-300" : "text-accent-600"}`} />
                  <span className="truncate">
                    {bm.label || `Page ${bm.page}`}
                  </span>
                </button>
                <button
                  onClick={() => onRemoveBookmark(bm._id)}
                  className={`opacity-0 group-hover:opacity-100 transition shrink-0 ${
                    dreamy ? "text-amber-100/30 hover:text-red-300" : "text-ink-300 hover:text-red-500"
                  }`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
