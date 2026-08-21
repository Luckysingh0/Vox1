import { useState } from "react";
import { StickyNote, Trash2, Plus, X, Pencil, Check } from "lucide-react";

/**
 * Right sidebar workspace panel — shows notes for the current book,
 * lets the user add a new note (tagged to the current page), and
 * delete existing ones. Notes created by the voice agent later will
 * also show up here (distinguished by a small "AI" badge).
 */
export default function NotesPanel({ notes, currentPage, onAddNote, onDeleteNote, onEditNote, apiOrigin = "", theme = "light" }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const dreamy = theme === "dreamy";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onAddNote(draft.trim());
      setDraft("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note) => {
    setEditingId(note._id);
    setEditDraft(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (noteId) => {
    if (!editDraft.trim()) return;
    setSavingEdit(true);
    try {
      await onEditNote(noteId, editDraft.trim());
      setEditingId(null);
      setEditDraft("");
    } finally {
      setSavingEdit(false);
    }
  };

  const inputClass = dreamy
    ? "border border-amber-100/15 bg-white/5 text-amber-50 placeholder:text-amber-100/30 focus:ring-amber-300/40"
    : "border border-cream-300 focus:ring-accent-400";
  const primaryBtnClass = dreamy
    ? "bg-amber-200 text-[#1a1230] hover:bg-amber-100"
    : "bg-ink-900 text-white hover:bg-ink-800";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wide ${dreamy ? "text-amber-100/40" : "text-ink-400"}`}>
          Notes
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`transition ${dreamy ? "text-amber-100/40 hover:text-amber-200" : "text-ink-400 hover:text-accent-600"}`}
          title="Add a note"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Note for page ${currentPage}...`}
            autoFocus
            rows={3}
            className={`w-full px-2.5 py-2 rounded-2xl text-xs resize-none focus:outline-none focus:ring-2 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className={`mt-2 w-full py-1.5 rounded-full text-xs font-medium transition disabled:opacity-60 ${primaryBtnClass}`}
          >
            {saving ? "Saving..." : "Save note"}
          </button>
        </form>
      )}

      {notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <StickyNote className={dreamy ? "text-amber-100/20 mb-2" : "text-ink-200 mb-2"} size={28} />
          <p className={`text-xs ${dreamy ? "text-amber-100/30" : "text-ink-300"}`}>
            No notes yet. Add one, or ask the voice agent to save an explanation here.
          </p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto thin-scrollbar flex-1">
          {notes.map((note) => (
            <div
              key={note._id}
              className={`p-3 rounded-2xl group relative ${
                dreamy ? "border border-amber-100/15 bg-white/5" : "border border-cream-300 bg-cream-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-medium ${dreamy ? "text-amber-100/40" : "text-ink-400"}`}>
                  Page {note.page}
                  {note.source === "agent" && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        dreamy ? "bg-amber-200/20 text-amber-200" : "bg-accent-100 text-ink-900"
                      }`}
                    >
                      AI
                    </span>
                  )}
                </span>
                {editingId !== note._id && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEdit(note)}
                      className={`transition ${dreamy ? "text-amber-100/30 hover:text-amber-200" : "text-ink-300 hover:text-accent-600"}`}
                      title="Edit note"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteNote(note._id)}
                      className={`transition ${dreamy ? "text-amber-100/30 hover:text-red-300" : "text-ink-300 hover:text-red-500"}`}
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
              {note.imageUrl && (
                <img
                  src={note.imageUrl.startsWith("http") ? note.imageUrl : `${apiOrigin}${note.imageUrl}`}
                  alt="Note visual"
                  className={`w-full rounded-xl mb-2 ${dreamy ? "border border-amber-100/15" : "border border-ink-100"}`}
                />
              )}
              {editingId === note._id ? (
                <div>
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    autoFocus
                    rows={3}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 ${inputClass}`}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveEdit(note._id)}
                      disabled={savingEdit || !editDraft.trim()}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition disabled:opacity-60 ${primaryBtnClass}`}
                    >
                      <Check size={11} />
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                        dreamy ? "text-amber-100/60 hover:bg-white/10" : "text-ink-500 hover:bg-cream-200"
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`text-xs leading-relaxed whitespace-pre-wrap ${dreamy ? "text-amber-100/80" : "text-ink-700"}`}>
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
