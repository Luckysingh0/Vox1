import { Link } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="relative z-10 flex items-center justify-between px-8 py-4">
      <Link to="/library" className="flex items-center gap-1.5">
        <span className="font-serif italic text-xl text-amber-50">Voxread</span>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mb-1.5 shadow-[0_0_8px_2px_rgba(252,211,77,0.6)]" />
      </Link>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm text-amber-100/70">
          <User size={14} />
          {user?.name?.split(" ")[0]}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-amber-100/60 hover:bg-white/10 hover:text-amber-50 transition"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </nav>
  );
}
