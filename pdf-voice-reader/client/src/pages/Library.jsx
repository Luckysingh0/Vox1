import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import { Plus, FolderPlus, BookOpen, Folder as FolderIcon, Upload, Search, Trash2, Pencil } from "lucide-react";

// A small rotating set of jewel-toned spine colors, tuned to glow softly
// against the dark background rather than the pastel set used in light mode.
const SPINE_COLORS = [
  "from-rose-500/30 to-rose-900/40",
  "from-amber-400/25 to-amber-800/35",
  "from-emerald-500/25 to-emerald-900/35",
  "from-sky-500/25 to-sky-900/35",
  "from-violet-500/30 to-violet-900/40",
  "from-orange-500/25 to-orange-900/35",
];

export default function Library() {
  const [folders, setFolders] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeFolder, setActiveFolder] = useState("all"); // "all" | "none" | folderId
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookToDelete, setBookToDelete] = useState(null); // book pending delete confirmation
  const [deleting, setDeleting] = useState(false);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAuthor, setUploadAuthor] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();

  const loadFolders = async () => {
    const res = await api.get("/folders");
    setFolders(res.data);
  };

  const loadBooks = async (folderId) => {
    setLoading(true);
    const params = {};
    if (folderId && folderId !== "all") params.folder = folderId;
    const res = await api.get("/books", { params });
    setBooks(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadBooks(activeFolder === "all" ? null : activeFolder);
  }, [activeFolder]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    await api.post("/folders", { name: folderName });
    setFolderName("");
    setShowFolderModal(false);
    loadFolders();
  };

  const startRenameFolder = (e, folder) => {
    e.stopPropagation(); // don't also select the folder when clicking the pencil
    setRenamingFolderId(folder._id);
    setRenameDraft(folder.name);
  };

  const cancelRenameFolder = () => {
    setRenamingFolderId(null);
    setRenameDraft("");
  };

  const saveRenameFolder = async (folderId) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      cancelRenameFolder();
      return;
    }
    await api.put(`/folders/${folderId}`, { name: trimmed });
    setRenamingFolderId(null);
    setRenameDraft("");
    loadFolders();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("author", uploadAuthor);
      if (activeFolder !== "all" && activeFolder !== "none") {
        formData.append("folder", activeFolder);
      }
      await api.post("/books/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowUploadModal(false);
      setUploadTitle("");
      setUploadAuthor("");
      setUploadFile(null);
      loadBooks(activeFolder === "all" ? null : activeFolder);
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Opens the confirm-delete modal for a book — stops the click from also
  // navigating into the reader (since the button sits on a clickable card).
  const handleDeleteClick = (e, book) => {
    e.stopPropagation();
    setBookToDelete(book);
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/books/${bookToDelete._id}`);
      setBookToDelete(null);
      loadBooks(activeFolder === "all" ? null : activeFolder);
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const filteredBooks = books.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  // Same fixed "floating candlelight" particle set used on the Home page,
  // kept subtle here since this is a working page, not just a landing hero.
  const particles = [
    { top: "8%", left: "12%", size: 2, delay: "0s", duration: "8s" },
    { top: "18%", left: "85%", size: 2, delay: "1.5s", duration: "9s" },
    { top: "70%", left: "6%", size: 2, delay: "2.8s", duration: "7.5s" },
    { top: "82%", left: "90%", size: 2, delay: "0.8s", duration: "10s" },
    { top: "45%", left: "95%", size: 2, delay: "3.2s", duration: "8.5s" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_#241b3d_0%,_#140f24_45%,_#0a0714_100%)]">
      {/* Ambient floating light specs, same mood as the Home hero */}
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-amber-200/60 animate-pulse"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              boxShadow: "0 0 6px 2px rgba(251, 191, 36, 0.35)",
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <Navbar />

      <div className="relative z-10 flex max-w-7xl mx-auto">
        {/* Sidebar - folders */}
        <aside className="w-56 shrink-0 px-4 pt-8">
          <button
            onClick={() => setShowFolderModal(true)}
            className="w-full flex items-center gap-2 px-3.5 py-2 mb-5 text-sm font-medium text-amber-100 bg-white/5 border border-amber-100/15 rounded-full hover:border-amber-200/40 hover:bg-white/10 transition backdrop-blur-sm"
          >
            <FolderPlus size={15} />
            New stack
          </button>

          <nav className="space-y-0.5">
            <button
              onClick={() => setActiveFolder("all")}
              className={`w-full flex items-center gap-2 px-3.5 py-2 rounded-full text-sm text-left transition ${
                activeFolder === "all"
                  ? "bg-amber-200/90 text-[#1a1230] font-medium"
                  : "text-amber-100/60 hover:bg-white/5"
              }`}
            >
              <BookOpen size={15} />
              All books
            </button>
            <button
              onClick={() => setActiveFolder("none")}
              className={`w-full flex items-center gap-2 px-3.5 py-2 rounded-full text-sm text-left transition ${
                activeFolder === "none"
                  ? "bg-amber-200/90 text-[#1a1230] font-medium"
                  : "text-amber-100/60 hover:bg-white/5"
              }`}
            >
              <FolderIcon size={15} />
              Uncategorized
            </button>

            <div className="pt-4 pb-1 px-3.5 text-xs font-semibold text-amber-100/30 uppercase tracking-wide">
              Stacks
            </div>
            {folders.map((f) =>
              renamingFolderId === f._id ? (
                <div key={f._id} className="px-1 py-0.5">
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRenameFolder(f._id);
                      if (e.key === "Escape") cancelRenameFolder();
                    }}
                    onBlur={() => saveRenameFolder(f._id)}
                    autoFocus
                    className="w-full px-3 py-1.5 rounded-full text-sm bg-white/10 border border-amber-200/40 text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>
              ) : (
                <button
                  key={f._id}
                  onClick={() => setActiveFolder(f._id)}
                  className={`w-full flex items-center gap-2 px-3.5 py-2 rounded-full text-sm text-left transition group ${
                    activeFolder === f._id
                      ? "bg-amber-200/90 text-[#1a1230] font-medium"
                      : "text-amber-100/60 hover:bg-white/5"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: f.color }}
                  />
                  <span className="truncate flex-1">{f.name}</span>
                  <span
                    onClick={(e) => startRenameFolder(e, f)}
                    className={`shrink-0 opacity-0 group-hover:opacity-100 transition p-0.5 rounded hover:bg-black/10 ${
                      activeFolder === f._id ? "text-[#1a1230]/60" : "text-amber-100/40"
                    }`}
                    title="Rename stack"
                  >
                    <Pencil size={11} />
                  </span>
                </button>
              )
            )}
          </nav>
        </aside>

        {/* Main content - book grid */}
        <main className="flex-1 px-6 pt-8 pb-16">
          <p className="text-xs font-medium text-amber-200/50 uppercase tracking-[0.15em] mb-1">
            Your reading room
          </p>
          <div className="flex items-start justify-between mb-2">
            <h1 className="font-serif text-4xl text-amber-50 drop-shadow-[0_0_20px_rgba(251,191,36,0.12)]">
              Library
            </h1>
          </div>
          <p className="text-sm text-amber-100/50 mb-6">
            A shelf for books you want to understand, not merely finish.
          </p>

          <div className="flex items-center gap-3 mb-8">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-100/40"
              />
              <input
                type="text"
                placeholder="Search your shelf"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full border border-amber-100/15 bg-white/5 text-amber-50 placeholder:text-amber-100/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/40 backdrop-blur-sm"
              />
            </div>
            <span className="text-xs text-amber-100/40">
              {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-[#1a1230] rounded-full text-sm font-semibold hover:bg-amber-100 transition shadow-[0_0_18px_rgba(252,211,77,0.3)]"
            >
              <Plus size={15} />
              Add a book
            </button>
          </div>

          {loading ? (
            <p className="text-amber-100/40 text-sm">Loading...</p>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-amber-100/15 rounded-3xl bg-white/[0.03] backdrop-blur-sm">
              <BookOpen className="mx-auto text-amber-100/25 mb-3" size={32} />
              <p className="text-amber-100/50 text-sm">No books here yet.</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-3 text-amber-200 text-sm font-medium underline underline-offset-2"
              >
                Upload your first PDF
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
              {filteredBooks.map((book, i) => (
                <div
                  key={book._id}
                  onClick={() => navigate(`/reader/${book._id}`)}
                  className="cursor-pointer group relative"
                >
                  <button
                    onClick={(e) => handleDeleteClick(e, book)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-amber-100/60 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300 transition"
                    title="Delete book"
                  >
                    <Trash2 size={13} />
                  </button>
                  <div
                    className={`aspect-[3/4] rounded-2xl bg-gradient-to-br ${
                      SPINE_COLORS[i % SPINE_COLORS.length]
                    } border border-amber-100/15 flex items-center justify-center group-hover:border-amber-200/40 group-hover:shadow-[0_0_24px_rgba(251,191,36,0.15)] group-hover:-translate-y-0.5 transition overflow-hidden backdrop-blur-sm`}
                  >
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="text-amber-100/30" size={28} />
                    )}
                  </div>
                  <p className="mt-2.5 text-sm font-medium text-amber-50 truncate">
                    {book.title}
                  </p>
                  <p className="text-xs text-amber-100/35 truncate">
                    {book.totalPages ? `${book.totalPages} pages` : book.author}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create folder modal */}
      <Modal
        open={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        title="New stack"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <input
            type="text"
            placeholder="e.g. Geography"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            autoFocus
            className="w-full px-4 py-2.5 rounded-full border border-amber-100/15 bg-white/5 text-amber-50 placeholder:text-amber-100/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/40"
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-amber-200 text-[#1a1230] rounded-full text-sm font-semibold hover:bg-amber-100 transition"
          >
            Create stack
          </button>
        </form>
      </Modal>

      {/* Upload book modal */}
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Add a book"
      >
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            type="text"
            placeholder="Book title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-full border border-amber-100/15 bg-white/5 text-amber-50 placeholder:text-amber-100/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/40"
          />
          <input
            type="text"
            placeholder="Author (optional)"
            value={uploadAuthor}
            onChange={(e) => setUploadAuthor(e.target.value)}
            className="w-full px-4 py-2.5 rounded-full border border-amber-100/15 bg-white/5 text-amber-50 placeholder:text-amber-100/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/40"
          />
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-100/20 rounded-2xl py-8 cursor-pointer hover:border-amber-200/40 transition bg-white/[0.03]">
            <Upload size={20} className="text-amber-100/40" />
            <span className="text-sm text-amber-100/50">
              {uploadFile ? uploadFile.name : "Click to select a PDF"}
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
          </label>
          <button
            type="submit"
            disabled={uploading || !uploadFile}
            className="w-full py-2.5 bg-amber-200 text-[#1a1230] rounded-full text-sm font-semibold hover:bg-amber-100 transition disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Add to library"}
          </button>
        </form>
      </Modal>

      {/* Confirm delete modal */}
      <Modal
        open={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        title="Delete this book?"
      >
        <p className="text-sm text-amber-100/60 mb-5">
          "{bookToDelete?.title}" and all its notes and bookmarks will be
          permanently removed. This can't be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setBookToDelete(null)}
            className="flex-1 py-2.5 bg-white/5 text-amber-100 border border-amber-100/15 rounded-full text-sm font-medium hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-full text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
