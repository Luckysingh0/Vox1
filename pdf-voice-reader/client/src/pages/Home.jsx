import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mic, FolderKanban, Sparkles, ArrowRight, Upload, MousePointerClick, MessageCircle, BookOpenCheck } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const features = [
    {
      icon: Mic,
      title: "Talk to your book",
      desc: "Point at a line, ask out loud — the agent sees your page and answers in real time.",
    },
    {
      icon: FolderKanban,
      title: "A shelf that stays organized",
      desc: "Group books into stacks like Geography or Novels, and pick up right where you left off.",
    },
    {
      icon: Sparkles,
      title: "Visualize the hard parts",
      desc: "Ask the agent to picture a concept and it drops a visual right into your notes.",
    },
  ];

  // A handful of fixed "floating dust / candlelight" particles — positions
  // and delays are hand-picked (not random) so the effect is consistent
  // and doesn't jump around on re-render.
  const steps = [
    {
      icon: Upload,
      title: "Upload your book",
      desc: "Drop in a PDF — Voxread reads the whole thing in the background, so the agent already knows the material.",
    },
    {
      icon: MousePointerClick,
      title: "Point at a line",
      desc: "Hover or select any text on the page. That becomes the exact thing you're asking about.",
    },
    {
      icon: Mic,
      title: "Ask out loud",
      desc: "Tap the mic and talk — explain this, turn the page, bookmark this, save a note. No typing.",
    },
    {
      icon: BookOpenCheck,
      title: "Get a spoken answer",
      desc: "The agent replies in voice, grounded in the book — pulling from the whole text, not just this page.",
    },
  ];

  const particles = [
    { top: "12%", left: "8%", size: 3, delay: "0s", duration: "7s" },
    { top: "22%", left: "88%", size: 2, delay: "1.2s", duration: "9s" },
    { top: "68%", left: "5%", size: 2, delay: "2.4s", duration: "8s" },
    { top: "78%", left: "92%", size: 3, delay: "0.6s", duration: "10s" },
    { top: "40%", left: "15%", size: 2, delay: "3s", duration: "7.5s" },
    { top: "15%", left: "45%", size: 2, delay: "1.8s", duration: "8.5s" },
    { top: "55%", left: "80%", size: 3, delay: "2.2s", duration: "9.5s" },
    { top: "85%", left: "35%", size: 2, delay: "0.3s", duration: "8s" },
    { top: "30%", left: "70%", size: 2, delay: "3.5s", duration: "7s" },
    { top: "60%", left: "50%", size: 3, delay: "1.5s", duration: "9s" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_#241b3d_0%,_#140f24_45%,_#0a0714_100%)]">
      {/* Distant glowing "windows" / stars */}
      <div className="absolute inset-0 opacity-60">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-amber-200/70 animate-pulse"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              boxShadow: "0 0 6px 2px rgba(251, 191, 36, 0.4)",
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Soft mist gradient at the bottom, like fog over castle grounds */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0a0714] to-transparent pointer-events-none" />

      {/* Castle silhouette — simple layered SVG shapes, evoking spires
          without depicting any specific copyrighted building */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full opacity-40 pointer-events-none"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 220V140L40 130V90L60 80V60L70 40L80 60V90L100 100V70L115 50L130 70V100L150 90V130L180 120V60L200 30L220 60V120L250 100V150L280 90L300 40L320 90L350 150V110L380 130V80L400 50L420 80V130L450 110V160L480 100V140L520 90L540 30L560 90V140L600 100V160L640 110V150L680 90L700 40L720 90V150L760 120V80L790 60L810 90V120L840 100V150L870 120V70L900 30L920 70V120L950 100V150L1000 110V60L1020 30L1040 60V110L1070 90V150L1100 120V80L1130 60L1150 100V150L1200 130V220H0Z"
          fill="#0a0714"
        />
      </svg>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-1.5">
          <span className="font-serif italic text-2xl text-amber-50">Voxread</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mb-2 shadow-[0_0_8px_2px_rgba(252,211,77,0.6)]" />
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/library"
              className="px-5 py-2 bg-amber-200/90 text-[#1a1230] rounded-full text-sm font-semibold hover:bg-amber-100 transition shadow-[0_0_16px_rgba(252,211,77,0.25)]"
            >
              Go to Library
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-amber-100/80 hover:text-amber-50 transition"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 bg-amber-200/90 text-[#1a1230] rounded-full text-sm font-semibold hover:bg-amber-100 transition shadow-[0_0_16px_rgba(252,211,77,0.25)]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-3xl mx-auto text-center px-6 pt-20 pb-16">
        <p className="text-xs font-medium tracking-[0.2em] text-amber-200/70 uppercase mb-6">
          A reading companion that sees your page
        </p>
        <h1 className="font-serif text-6xl sm:text-7xl text-amber-50 leading-[1.05] tracking-tight drop-shadow-[0_0_30px_rgba(251,191,36,0.15)]">
          Point to a line.
          <br />
          Ask out loud.
        </h1>
        <p className="mt-6 text-base text-amber-100/60 max-w-xl mx-auto leading-relaxed">
          Voxread follows your place on the page, answers in real-time voice, and
          makes difficult ideas visible — without turning reading into another
          chat window.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            to={user ? "/library" : "/register"}
            className="group flex items-center gap-2 px-6 py-3 bg-amber-200 text-[#1a1230] rounded-full font-semibold hover:bg-amber-100 transition shadow-[0_0_24px_rgba(252,211,77,0.35)]"
          >
            {user ? "Open your library" : "Open your first book"}
            <ArrowRight
              size={16}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
          {!user && (
            <Link
              to="/login"
              className="px-6 py-3 bg-white/5 text-amber-100 rounded-full font-medium border border-amber-100/20 hover:border-amber-100/40 hover:bg-white/10 transition backdrop-blur-sm"
            >
              I already have an account
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-medium tracking-[0.2em] text-amber-200/70 uppercase mb-3">
            How it works
          </p>
          <h2 className="font-serif text-3xl text-amber-50">
            From PDF to conversation, in four steps
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connecting line across the steps, desktop only */}
          <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="relative text-center px-2">
              <div className="relative z-10 w-12 h-12 mx-auto rounded-full bg-[#1a1230] border border-amber-200/30 flex items-center justify-center mb-4 shadow-[0_0_16px_rgba(251,191,36,0.12)]">
                <Icon className="text-amber-200" size={18} />
              </div>
              <p className="text-[11px] font-semibold text-amber-200/50 mb-1.5">
                STEP {i + 1}
              </p>
              <h3 className="font-medium text-amber-50 mb-1.5">{title}</h3>
              <p className="text-sm text-amber-100/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-32 grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="p-6 rounded-2xl bg-white/[0.04] border border-amber-100/10 hover:border-amber-200/30 hover:bg-white/[0.06] transition backdrop-blur-sm"
          >
            <div className="w-10 h-10 rounded-full bg-amber-200/10 flex items-center justify-center mb-4 border border-amber-200/20">
              <Icon className="text-amber-200" size={18} />
            </div>
            <h3 className="font-medium text-amber-50 mb-1.5">{title}</h3>
            <p className="text-sm text-amber-100/50 leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
