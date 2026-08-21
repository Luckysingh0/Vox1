import { useState, useRef, useCallback, useEffect } from "react";
import api from "../api/axios";

/**
 * Manages the voice agent lifecycle:
 * - Listens via the browser's SpeechRecognition (STT)
 * - Sends the transcript + page context to the backend agent
 * - Speaks the agent's reply back via SpeechSynthesis (TTS)
 * - Returns any tool calls (turn_page, generate_image, save_to_notes) for
 *   the caller to execute
 */
export function useVoiceAgent({ bookId, bookTitle, currentPage, getContextText, onToolCalls }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentReply, setAgentReply] = useState("");
  const [supported, setSupported] = useState(true);
  // "en-US" or "hi-IN" — toggled by the user via the mic bar's language switch.
  const [language, setLanguage] = useState("en-US");

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  // Always holds the LATEST handleUserSpeech (with current page/context),
  // so recognition.onend (set up once per language change, not per render)
  // never calls a stale closure with an outdated currentPage/context.
  const handleUserSpeechRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + " ";
        } else {
          interim += text;
        }
      }
      finalTranscriptRef.current = final;
      setTranscript((final || interim).trim());
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscriptRef.current.trim()) {
        handleUserSpeechRef.current?.(finalTranscriptRef.current.trim());
      }
      finalTranscriptRef.current = "";
    };
    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop any current speech first
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = language;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const handleUserSpeech = useCallback(
    async (text) => {
      setIsThinking(true);
      setAgentReply("");
      try {
        const context = getContextText ? getContextText() : { text: "", mode: "none" };
        const res = await api.post("/agent/chat", {
          transcript: text,
          bookId,
          currentPage,
          hoveredText: context.text,
          contextMode: context.mode,
          pageText: context.pageText,
          bookTitle,
        });

        const { reply, toolCalls } = res.data;
        setAgentReply(reply);
        speak(reply);

        if (onToolCalls) {
          onToolCalls(toolCalls || []);
        }
      } catch (err) {
        console.error("Agent request failed:", err);
        const fallback = "Sorry, I couldn't reach the agent just now.";
        setAgentReply(fallback);
        speak(fallback);
      } finally {
        setIsThinking(false);
      }
    },
    [bookId, bookTitle, currentPage, getContextText, onToolCalls, speak]
  );

  // Keep the ref pointed at the latest handleUserSpeech on every render, so
  // recognition.onend (set up once per language change) always calls the
  // version with the current page/context, not a stale one.
  handleUserSpeechRef.current = handleUserSpeech;

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript("");
    setAgentReply("");
    window.speechSynthesis?.cancel();
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws if already started — ignore
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Immediately cancels any ongoing speech — used when the user wants to
  // interrupt the agent mid-reply rather than waiting for it to finish.
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
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
  };
}