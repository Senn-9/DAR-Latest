"use client";
import React, { useEffect, useRef, useState } from "react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export function RichEditor({ value, onChange, className, style, compact = false }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);
  const savedRange = useRef<Range | null>(null);
  const [boldActive, setBoldActive] = useState(false);
  const [centerActive, setCenterActive] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isFocused.current) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange.current) {
      try {
        sel?.removeAllRanges();
        sel?.addRange(savedRange.current);
      } catch { /* ignore stale range errors */ }
    }
  };

  const updateToolbarState = () => {
    try {
      setBoldActive(document.queryCommandState("bold"));
      setCenterActive(document.queryCommandState("justifyCenter"));
    } catch { /* ignore */ }
  };

  const execCmd = (cmd: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(cmd, false, undefined);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    updateToolbarState();
  };

  const btnBase = "flex items-center justify-center rounded border transition-colors cursor-pointer select-none";
  const btnSize = compact ? "w-5 h-4 text-[8px]" : "w-7 h-6 text-xs";
  const btnOn = "bg-emerald-600 text-white border-emerald-600";
  const btnOff = "bg-white text-gray-600 border-gray-300 hover:border-emerald-400";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex gap-1">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); execCmd("bold"); }}
          title="Bold selected text"
          className={`${btnBase} ${btnSize} font-bold ${boldActive ? btnOn : btnOff}`}
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); execCmd(centerActive ? "justifyLeft" : "justifyCenter"); }}
          title="Center / left-align current line"
          className={`${btnBase} ${btnSize} ${centerActive ? btnOn : btnOff}`}
        >
          ≡
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => { isFocused.current = true; updateToolbarState(); }}
        onBlur={() => { isFocused.current = false; if (editorRef.current) onChange(editorRef.current.innerHTML); }}
        onInput={() => { if (editorRef.current) onChange(editorRef.current.innerHTML); }}
        onMouseUp={() => { saveSelection(); updateToolbarState(); }}
        onKeyUp={() => { saveSelection(); updateToolbarState(); }}
        className={className}
        style={{ minHeight: compact ? "16px" : "76px", cursor: "text", ...style }}
      />
    </div>
  );
}
