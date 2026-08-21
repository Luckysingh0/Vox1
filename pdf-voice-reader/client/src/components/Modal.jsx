import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1a1230] border border-amber-100/15 rounded-3xl shadow-2xl w-full max-w-md p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg text-amber-50">{title}</h2>
          <button
            onClick={onClose}
            className="text-amber-100/40 hover:text-amber-100 transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
