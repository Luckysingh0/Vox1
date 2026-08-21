import { useEffect, useRef, useState } from "react";

/**
 * Renders one PDF page (canvas + invisible text layer on top).
 * Reports mouse hover position (as % of page width/height) up to the
 * parent, so the parent can ask the agent "explain what's near this point".
 */
export default function PdfPage({
  pageNum,
  renderPage,
  onHoverText,
  getTextNearPoint,
  onTextSelected,
  highlightLockTrigger,
  zoom = 1.4,
}) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [highlightBox, setHighlightBox] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const hasSelectionRef = useRef(false);
  const hoverTimeout = useRef(null);
  // Accumulates the words the mouse has passed over during one continuous
  // hover "sweep" — e.g. hovering from "Hi" to the end of a sentence
  // highlights and reports that whole span, not just the last word touched.
  // A session resets after a short pause (new sweep) or on mouse leave/click.
  const hoverSessionRef = useRef([]); // array of { text, box }
  const sessionResetTimer = useRef(null);

  useEffect(() => {
    let active = true;
    setRendered(false);
    renderPage(pageNum, canvasRef.current, textLayerRef.current, zoom).then(() => {
      if (active) setRendered(true);
    });
    return () => {
      active = false;
    };
  }, [pageNum, renderPage, zoom]);

  // When the agent calls highlight_text, freeze whatever is currently
  // highlighted (hover or selection) in place.
  useEffect(() => {
    if (highlightLockTrigger) setIsLocked(true);
  }, [highlightLockTrigger]);

  const resetHoverSession = () => {
    hoverSessionRef.current = [];
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (hasSelectionRef.current || isLocked) return; // don't override an active selection or a locked highlight
    // Debounce so we're not extracting text on every pixel of movement
    clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      const xPercent = (e.clientX - rect.left) / rect.width;
      const yPercent = (e.clientY - rect.top) / rect.height;
      const result = getTextNearPoint(pageNum, xPercent, yPercent);
      const text = result?.text || "";

      if (!text) {
        // Mouse moved somewhere with no word nearby — don't leave a stale
        // highlight from wherever it was last, and start fresh next time
        // it lands on text.
        resetHoverSession();
        setHighlightBox(null);
        return;
      }

      // If this exact word is already the last one in the session, do
      // nothing (mouse hasn't moved to a new word yet) — this is what
      // makes hover "sticky" while the mouse stays still on a word.
      const session = hoverSessionRef.current;
      const last = session[session.length - 1];
      if (last && last.box.left === result.box.left && last.box.top === result.box.top) {
        return;
      }

      // If the new word is far from the last one (the mouse jumped to a
      // different part of the page rather than sweeping across nearby
      // text), start a fresh session instead of accumulating a huge span.
      if (last) {
        const dx = result.box.left - last.box.left;
        const dy = result.box.top - last.box.top;
        const jumped = Math.hypot(dx, dy) > 150;
        if (jumped) resetHoverSession();
      }

      const activeSession = hoverSessionRef.current;
      activeSession.push({ text, box: result.box });

      // Combine all words in the current session into one phrase + box.
      const combinedText = activeSession.map((s) => s.text).join(" ");
      const left = Math.min(...activeSession.map((s) => s.box.left));
      const top = Math.min(...activeSession.map((s) => s.box.top));
      const right = Math.max(...activeSession.map((s) => s.box.left + s.box.width));
      const bottom = Math.max(...activeSession.map((s) => s.box.top + s.box.height));
      const combinedBox = { left, top, width: right - left, height: bottom - top };

      setHighlightBox(combinedBox);
      if (onHoverText) {
        onHoverText({ pageNum, text: combinedText, x: xPercent, y: yPercent });
      }
    }, 60);
  };

  // Clear the highlight when the mouse leaves the page entirely
  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout.current);
    clearTimeout(sessionResetTimer.current);
    resetHoverSession();
    if (!hasSelectionRef.current) setHighlightBox(null);
  };

  // When the user releases the mouse after dragging over text, check if
  // they actually selected something (vs. just clicking). Selected text
  // is the strongest, most explicit signal of what they're asking about —
  // it takes priority over hover context. The highlight box is computed
  // from the selection's own exact bounds, so it matches only what was
  // actually selected rather than a fixed line-height band.
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 0) {
      hasSelectionRef.current = true;
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      const containerRect = containerRef.current.getBoundingClientRect();
      if (rects.length > 0) {
        const left = Math.min(...rects.map((r) => r.left)) - containerRect.left;
        const right = Math.max(...rects.map((r) => r.right)) - containerRect.left;
        const top = Math.min(...rects.map((r) => r.top)) - containerRect.top;
        const bottom = Math.max(...rects.map((r) => r.bottom)) - containerRect.top;
        setHighlightBox({ left, top, width: right - left, height: bottom - top });
      }
      if (onTextSelected) onTextSelected({ pageNum, text: selectedText });
    } else {
      // Click with no drag — clears any previous selection highlight (and
      // any locked highlight) so hover can take over again, fresh session.
      hasSelectionRef.current = false;
      setIsLocked(false);
      resetHoverSession();
      setHighlightBox(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto mb-4 shadow-card rounded-sm overflow-hidden bg-white pdf-big-cursor"
      style={{ width: "fit-content" }}
      data-page-num={pageNum}
    >
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="absolute top-0 left-0 select-text"
        style={{ opacity: 1 }}
      />
      {highlightBox && (
        <div
          className={`absolute pointer-events-none rounded-xl transition-all duration-150 ${
            isLocked
              ? "bg-pink-400/35 ring-2 ring-pink-500"
              : "bg-pink-300/25 ring-1 ring-pink-400/50"
          }`}
          style={{
            left: highlightBox.left - 8,
            top: highlightBox.top - 6,
            width: highlightBox.width + 16,
            height: highlightBox.height + 12,
          }}
        />
      )}
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-50 text-ink-300 text-xs">
          Rendering page {pageNum}...
        </div>
      )}
    </div>
  );
}
