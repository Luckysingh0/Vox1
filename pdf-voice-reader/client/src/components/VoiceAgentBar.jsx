import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";

export default function VoiceAgentBar({ voiceAgent, theme = "light" }) {
  const {
    supported,
    isListening,
    isSpeaking,
    isThinking,
    transcript,
    agentReply,
    language,
    setLanguage,
    startListening,
    stopListening,
    stopSpeaking,
  } = voiceAgent;
  const dreamy = theme === "dreamy";

  if (!supported) {
    return (
      <div
        className={`px-5 py-3 text-center text-xs rounded-b-2xl ${
          dreamy ? "border-t border-amber-100/15 bg-white/5 text-amber-100/40" : "border-t border-cream-300 bg-cream-50 text-ink-400"
        }`}
      >
        Voice isn't supported in this browser — try Chrome or Edge.
      </div>
    );
  }

  const busy = isThinking; // speaking no longer blocks the button — clicking it interrupts speech

  const handleMicClick = () => {
    if (isSpeaking) {
      stopSpeaking();
      startListening(); // let the user jump straight into asking the next thing
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div
      className={`px-5 py-3.5 shrink-0 rounded-b-2xl ${
        dreamy ? "border-t border-amber-100/15 bg-white/5" : "border-t border-cream-300 bg-cream-50"
      }`}
    >
      <div className="flex items-center gap-3.5 max-w-3xl mx-auto">
        <div className="relative shrink-0">
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-red-400/40 animate-ping" />
          )}
          <button
            onClick={handleMicClick}
            disabled={busy}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition shadow-sm ${
              isListening
                ? "bg-red-500 text-white"
                : isSpeaking
                ? dreamy
                  ? "bg-amber-100/10 text-amber-100 hover:bg-amber-100/20"
                  : "bg-ink-900 text-white hover:bg-ink-800"
                : busy
                ? dreamy
                  ? "bg-white/5 text-amber-100/30"
                  : "bg-cream-200 text-ink-300"
                : dreamy
                ? "bg-amber-200 text-[#1a1230] hover:bg-amber-100 shadow-[0_0_16px_rgba(252,211,77,0.3)]"
                : "bg-accent-500 text-ink-900 hover:bg-accent-400"
            }`}
            title={
              isSpeaking
                ? "Tap to interrupt"
                : isListening
                ? "Stop listening"
                : "Talk to the agent"
            }
          >
            {isThinking ? (
              <Loader2 size={19} className="animate-spin" />
            ) : isSpeaking ? (
              <Volume2 size={19} />
            ) : isListening ? (
              <MicOff size={19} />
            ) : (
              <Mic size={19} />
            )}
          </button>
        </div>

        <div
          className={`flex-1 min-w-0 text-xs rounded-2xl px-4 py-2.5 ${
            dreamy ? "bg-white/5 border border-amber-100/15" : "bg-white border border-cream-300"
          }`}
        >
          {isListening && (
            <p className={dreamy ? "text-amber-50" : "text-ink-700"}>
              <span className="text-red-400 font-medium">Listening...</span>{" "}
              {transcript && <span className={dreamy ? "text-amber-100/60" : "text-ink-500"}>{transcript}</span>}
            </p>
          )}
          {isThinking && <p className={dreamy ? "text-amber-100/40" : "text-ink-400"}>Thinking...</p>}
          {!isListening && !isThinking && transcript && (
            <p className={`truncate ${dreamy ? "text-amber-100/60" : "text-ink-500"}`}>
              <span className={dreamy ? "text-amber-100/30" : "text-ink-400"}>You:</span> {transcript}
            </p>
          )}
          {agentReply && !isThinking && (
            <p className={`leading-relaxed max-h-24 overflow-y-auto thin-scrollbar ${dreamy ? "text-amber-50" : "text-ink-800"}`}>
              <span className={`font-semibold ${dreamy ? "text-amber-200" : "text-accent-700"}`}>Agent:</span> {agentReply}
            </p>
          )}
          {!isListening && !isThinking && !transcript && !agentReply && (
            <p className={dreamy ? "text-amber-100/25" : "text-ink-300"}>
              Tap the mic and ask — "explain this", "next page", "save this"...
            </p>
          )}
        </div>

        <button
          onClick={() => setLanguage(language === "en-US" ? "hi-IN" : "en-US")}
          disabled={isListening || busy}
          className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium transition disabled:opacity-50 ${
            dreamy
              ? "bg-white/5 border border-amber-100/15 text-amber-100 hover:border-amber-200/40"
              : "bg-white border border-cream-300 text-ink-600 hover:border-ink-300"
          }`}
          title="Switch voice input language"
        >
          {language === "en-US" ? "EN" : "हिं"}
        </button>
      </div>
    </div>
  );
}
