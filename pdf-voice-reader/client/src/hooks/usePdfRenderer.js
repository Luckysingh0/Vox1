import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// pdf.js outline items reference a "destination" (either a named string or
// an explicit array), not a page number directly. This resolves either form
// down to a 1-indexed page number.
async function resolveOutlineDestPage(pdfDoc, outlineItem) {
  try {
    let dest = outlineItem.dest;
    if (typeof dest === "string") {
      dest = await pdfDoc.getDestination(dest);
    }
    if (!dest || !dest[0]) return null;
    const pageIndex = await pdfDoc.getPageIndex(dest[0]);
    return pageIndex + 1; // pdf.js page indices are 0-based
  } catch {
    return null;
  }
}

/**
 * Loads a PDF from a URL and gives back:
 * - pdfDoc: the loaded pdf.js document
 * - numPages
 * - loading / error state
 * - renderPage(pageNum, canvasEl, textLayerEl): renders a page's canvas + text layer
 * - getTextAtPoint(pageNum, x, y): text content near a point (for mouse-hover explain)
 */
export function usePdfRenderer(fileUrl) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Auto-detected chapters from the PDF's embedded outline/bookmarks, if any.
  // Each entry: { title, page }. Empty array if the PDF has no outline.
  const [detectedOutline, setDetectedOutline] = useState([]);

  // Cache of text content per page so we don't re-fetch on every hover
  const textContentCache = useRef(new Map());
  // Tracks the in-flight render task per canvas element, so we can cancel
  // a stale render before starting a new one on the same canvas (this is
  // what React StrictMode's double-invoke in dev mode would otherwise break).
  const renderTaskMap = useRef(new WeakMap());

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetectedOutline([]);

    const loadingTask = pdfjsLib.getDocument(fileUrl);
    loadingTask.promise
      .then(async (doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);

        // Try to extract the PDF's built-in outline (table of contents).
        // Not all PDFs have one — that's fine, we just get an empty array.
        try {
          const outline = await doc.getOutline();
          if (cancelled || !outline || outline.length === 0) return;

          const flatChapters = [];
          for (const item of outline) {
            const pageNum = await resolveOutlineDestPage(doc, item);
            if (pageNum) {
              flatChapters.push({ title: item.title, page: pageNum });
            }
          }
          if (!cancelled && flatChapters.length > 0) {
            setDetectedOutline(flatChapters);
          }
        } catch (err) {
          // Outline extraction failing is non-fatal — just means no auto TOC
          console.warn("Could not extract PDF outline:", err.message);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load PDF:", err);
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      textContentCache.current.clear();
    };
  }, [fileUrl]);

  // Renders both the canvas (visual) and an invisible text layer (for
  // selection + hover detection) on top of it, at the given scale.
  const renderPage = useCallback(
    async (pageNum, canvasEl, textLayerEl, scale = 1.4) => {
      if (!pdfDoc || !canvasEl) return null;

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // If a render is already in progress on this exact canvas (e.g. from
      // React StrictMode's dev double-invoke, or a fast page change), cancel
      // it first — pdf.js does not allow two concurrent renders on one canvas.
      const existingTask = renderTaskMap.current.get(canvasEl);
      if (existingTask) {
        existingTask.cancel();
      }

      const context = canvasEl.getContext("2d");
      canvasEl.width = viewport.width;
      canvasEl.height = viewport.height;

      const renderTask = page.render({ canvasContext: context, viewport });
      renderTaskMap.current.set(canvasEl, renderTask);

      let completed = true;
      try {
        await renderTask.promise;
      } catch (err) {
        // A cancelled render throws a RenderingCancelledException — this is
        // expected when we intentionally cancelled it above, so ignore it.
        if (err?.name === "RenderingCancelledException") {
          completed = false;
        } else {
          throw err;
        }
      } finally {
        if (renderTaskMap.current.get(canvasEl) === renderTask) {
          renderTaskMap.current.delete(canvasEl);
        }
      }

      if (!completed) return null;

      // Text layer for hover/selection - positioned exactly over the canvas
      if (textLayerEl) {
        textLayerEl.innerHTML = "";
        textLayerEl.style.width = `${viewport.width}px`;
        textLayerEl.style.height = `${viewport.height}px`;

        const textContent = await page.getTextContent();
        textContentCache.current.set(pageNum, { textContent, viewport });

        textContent.items.forEach((item) => {
          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const span = document.createElement("span");
          span.textContent = item.str;
          const fontHeight = Math.hypot(tx[2], tx[3]);
          span.style.position = "absolute";
          span.style.left = `${tx[4]}px`;
          span.style.top = `${tx[5] - fontHeight}px`;
          span.style.fontSize = `${fontHeight}px`;
          span.style.fontFamily = "sans-serif";
          span.style.lineHeight = "1";
          span.style.whiteSpace = "pre";
          span.style.color = "transparent";
          span.style.cursor = "text";
          span.dataset.pdfText = "true";
          textLayerEl.appendChild(span);
        });
      }

      return viewport;
    },
    [pdfDoc]
  );

  // Given a mouse position (relative to the page container) and the current
  // page number, find the paragraph/section of text near that point. This
  // powers "explain the section where my mouse is".
  const getTextNearPoint = useCallback((pageNum, xPercent, yPercent) => {
    const cached = textContentCache.current.get(pageNum);
    if (!cached) return { text: "", box: null };

    const { textContent, viewport } = cached;
    // PDF coordinates have origin at bottom-left (Y increases upward), but
    // yPercent/xPercent are measured from the top-left (CSS/mouse convention).
    // Flip Y so both are in the same coordinate space before comparing.
    const targetX = xPercent * viewport.width;
    const targetY = viewport.height - yPercent * viewport.height;

    const items = textContent.items
      .flatMap((item) => {
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.hypot(tx[2], tx[3]);
        const endTransform = [...item.transform];
        endTransform[4] += item.width;
        const txEnd = pdfjsLib.Util.transform(viewport.transform, endTransform);
        const totalWidth = Math.hypot(txEnd[4] - tx[4], txEnd[5] - tx[5]);

        const str = item.str;
        if (!str.trim()) return [];

        // Some PDFs give one text item per word already; others group an
        // entire line/sentence into one item. Split on spaces and estimate
        // each word's position proportionally by character count, so hover
        // is always word-precise regardless of how the PDF was authored.
        const words = str.split(/(\s+)/).filter((w) => w.length > 0);
        if (words.length <= 1) {
          return [{ str, y: tx[5], x: tx[4], fontHeight, width: totalWidth }];
        }

        const dirX = (txEnd[4] - tx[4]) / (totalWidth || 1);
        const dirY = (txEnd[5] - tx[5]) / (totalWidth || 1);
        let charOffset = 0;
        const out = [];
        for (const w of words) {
          const wWidth = (w.length / str.length) * totalWidth;
          if (w.trim()) {
            out.push({
              str: w,
              x: tx[4] + dirX * charOffset,
              y: tx[5] + dirY * charOffset,
              fontHeight,
              width: wWidth,
            });
          }
          charOffset += wWidth;
        }
        return out;
      })
      .filter((i) => i.str.trim().length > 0);

    // Find the word closest to the mouse point, rather than requiring the
    // point to fall exactly inside a bounding box — exact-match was too
    // fragile (a mouse position even a couple pixels off would miss every
    // word and return nothing). We still only accept a match within a
    // reasonable distance, so hovering far from any text still highlights
    // nothing.
    const maxDistance = 24; // px — how far the mouse can be from a word and still "hit" it
    let best = null;
    let bestDist = Infinity;

    for (const i of items) {
      // Distance from the point to the word's bounding box (0 if inside).
      const boxLeft = i.x;
      const boxRight = i.x + i.width;
      const boxTop = i.y - i.fontHeight;
      const boxBottom = i.y;

      const dx = Math.max(boxLeft - targetX, 0, targetX - boxRight);
      const dy = Math.max(boxTop - targetY, 0, targetY - boxBottom);
      const dist = Math.hypot(dx, dy);

      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }

    if (!best || bestDist > maxDistance) return { text: "", box: null };

    const box = {
      left: best.x,
      top: viewport.height - best.y,
      width: best.width,
      height: best.fontHeight,
    };

    return { text: best.str.trim(), box };
  }, []);

  // Returns the full extracted text of a page — used as a fallback context
  // when the user asks a question without selecting or hovering anything.
  const getFullPageText = useCallback((pageNum) => {
    const cached = textContentCache.current.get(pageNum);
    if (!cached) return "";
    return cached.textContent.items
      .map((item) => item.str)
      .join(" ")
      .trim();
  }, []);

  return {
    pdfDoc,
    numPages,
    loading,
    error,
    detectedOutline,
    renderPage,
    getTextNearPoint,
    getFullPageText,
  };
}