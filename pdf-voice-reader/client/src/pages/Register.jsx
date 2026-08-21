import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/library");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-1.5 justify-center mb-8">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="font-serif italic text-2xl text-ink-900">Voxread</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 mb-2" />
          </Link>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-card border border-cream-300">
          <h1 className="font-serif text-2xl text-ink-900 text-center mb-1">
            Create your account
          </h1>
          <p className="text-sm text-ink-500 text-center mb-6">
            Start reading with your AI companion
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-full border border-cream-300 bg-cream-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-full border border-cream-300 bg-cream-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-full border border-cream-300 bg-cream-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent-500 text-ink-900 rounded-full text-sm font-semibold hover:bg-accent-400 transition disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="text-sm text-ink-500 text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-ink-900 font-medium underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
