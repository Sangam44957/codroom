"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Eraser, Trash2, Pencil, Maximize2, Minimize2 } from "lucide-react";

const COLORS = ["#ffffff", "#a78bfa", "#22d3ee", "#4ade80", "#f87171", "#fbbf24"];
const SIZES  = [2, 4, 8];

export default function Whiteboard({ onDraw, onClear, onRemoteDraw, onRemoteClear, onToggleFullscreen, isFullscreen }) {
  const canvasRef  = useRef(null);
  const drawing    = useRef(false);
  const lastPos    = useRef(null);
  const toolRef    = useRef({ color: "#ffffff", size: 4, eraser: false });

  const [color, setColor]   = useState("#ffffff");
  const [size, setSize]     = useState(4);
  const [eraser, setEraser] = useState(false);

  // Keep toolRef in sync so draw handlers always read fresh values
  useEffect(() => {
    toolRef.current = { color, size, eraser };
  }, [color, size, eraser]);

  // Resize canvas to fill container without clearing content
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!w || !h) return;
      const tmp = document.createElement("canvas");
      tmp.width  = canvas.width;
      tmp.height = canvas.height;
      if (tmp.width > 0 && tmp.height > 0) tmp.getContext("2d").drawImage(canvas, 0, 0);
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0d0d14";
      ctx.fillRect(0, 0, w, h);
      if (tmp.width > 0 && tmp.height > 0) ctx.drawImage(tmp, 0, 0);
    });
    observer.observe(canvas);
    canvas.width  = canvas.offsetWidth  || canvas.parentElement?.offsetWidth  || 300;
    canvas.height = canvas.offsetHeight || canvas.parentElement?.offsetHeight || 400;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return () => observer.disconnect();
  }, []);

  const drawSegment = useCallback((ctx, stroke) => {
    if (stroke.eraser) {
      // Paint background color instead of punching through
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#0d0d14";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }
    ctx.lineWidth = stroke.size;
    ctx.lineCap   = "round";
    ctx.lineJoin  = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.x0, stroke.y0);
    ctx.lineTo(stroke.x1, stroke.y1);
    ctx.stroke();
  }, []);

  // Register remote draw handler — update ref directly so it always stays fresh
  useEffect(() => {
    onRemoteDraw?.((stroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawSegment(canvas.getContext("2d"), stroke);
    });
  }, [onRemoteDraw, drawSegment]);

  useEffect(() => {
    onRemoteClear?.(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0d0d14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }, [onRemoteClear]);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches?.[0] ?? e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  }

  function moveDraw(e) {
    e.preventDefault();
    if (!drawing.current) return;
    const pos = getPos(e);
    const { color: c, size: s, eraser: er } = toolRef.current;
    const stroke = {
      x0: lastPos.current.x, y0: lastPos.current.y,
      x1: pos.x,             y1: pos.y,
      color: c, size: s, eraser: er,
    };
    drawSegment(canvasRef.current.getContext("2d"), stroke);
    onDraw?.(stroke);
    lastPos.current = pos;
  }

  function endDraw() { drawing.current = false; lastPos.current = null; }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClear?.();
  }

  function selectPen(c) { setColor(c); setEraser(false); }
  function selectSize(s) { setSize(s); setEraser(false); }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] flex-shrink-0 flex-wrap">

        {/* Pen tool button */}
        <button
          onClick={() => setEraser(false)}
          className={`p-1.5 rounded transition-colors ${
            !eraser
              ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/50"
              : "text-slate-500 hover:text-white hover:bg-white/[0.05]"
          }`}
          title="Pen"
        >
          <Pencil size={13} />
        </button>

        {/* Eraser tool button */}
        <button
          onClick={() => setEraser(true)}
          className={`p-1.5 rounded transition-colors ${
            eraser
              ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/50"
              : "text-slate-500 hover:text-white hover:bg-white/[0.05]"
          }`}
          title="Eraser"
        >
          <Eraser size={13} />
        </button>

        <div className="w-px h-4 bg-white/10" />

        {/* Colors — only relevant when pen is active */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => selectPen(c)}
              className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: !eraser && color === c ? "#fff" : "transparent",
                boxShadow: !eraser && color === c ? `0 0 0 1px ${c}` : "none",
              }}
            />
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Sizes */}
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => selectSize(s)}
              className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                size === s ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/[0.05]"
              }`}
            >
              <div
                className="rounded-full"
                style={{
                  width: s + 2,
                  height: s + 2,
                  backgroundColor: eraser ? "#64748b" : color,
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Clear */}
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
          title="Clear canvas"
        >
          <Trash2 size={12} /> Clear
        </button>

        {/* Fullscreen toggle */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-colors"
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isFullscreen ? "Exit" : "Expand"}
          </button>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full touch-none"
        style={{ cursor: eraser ? "cell" : "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}
