"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UacsCode } from "@/types/tables";

interface Props {
  value: string;
  onChange: (code: string, description: string) => void;
  inputClassName?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  allCodes?: UacsCode[];
}

export function UacsCombobox({
  value,
  onChange,
  inputClassName,
  style,
  placeholder = "UACS Object Code",
  allCodes = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display when parent resets/changes value externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Filtered list: all codes when query is empty, substring match otherwise
  const filtered = useMemo<UacsCode[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCodes.slice(0, 20);
    return allCodes
      .filter(
        (c) =>
          c.uacs_code.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [allCodes, query]);

  const handleSelect = (row: UacsCode) => {
    setQuery(row.uacs_code);
    onChange(row.uacs_code, row.description);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    // Auto-fill description on exact code match while typing
    const exact = allCodes.find(
      (c) => c.uacs_code.toLowerCase() === val.trim().toLowerCase()
    );
    if (exact) {
      onChange(exact.uacs_code, exact.description);
    } else {
      onChange(val, "");
    }
  };

  const handleBlur = () => {
    // Small delay so onClick on a dropdown item fires first
    setTimeout(() => {
      setOpen(false);
      // On blur, do a final exact-match check and fill description if found
      const match = allCodes.find(
        (c) => c.uacs_code.toLowerCase() === query.trim().toLowerCase()
      );
      if (match) onChange(match.uacs_code, match.description);
    }, 200);
  };

  // Prevent dropdown click from triggering input blur
  const handleDropdownMouseDown = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Input + chevron toggle */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          className={inputClassName}
          style={{ ...style, width: "100%", paddingRight: "22px", boxSizing: "border-box" }}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={handleDropdownMouseDown}
          onClick={() => setOpen((prev) => !prev)}
          style={{
            position: "absolute",
            right: 3,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 2px",
            color: "#9ca3af",
            fontSize: "9px",
            lineHeight: 1,
          }}
          aria-label="Toggle UACS list"
        >
          {open ? "▲" : "▼"}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          onMouseDown={handleDropdownMouseDown}
          style={{
            position: "absolute",
            zIndex: 9999,
            top: "100%",
            left: 0,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            boxShadow: "0 6px 16px rgba(0,0,0,.18)",
            minWidth: 400,
            maxHeight: 260,
            overflowY: "auto",
            fontSize: "8pt",
          }}
        >
          {allCodes.length === 0 ? (
            <div style={{ padding: "8px 12px", color: "#9ca3af", fontStyle: "italic" }}>
              Loading UACS codes…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "8px 12px", color: "#9ca3af", fontStyle: "italic" }}>
              No match — will be saved as manual code
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelect(r)}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "6px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f3f4f6",
                  alignItems: "baseline",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <span
                  style={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: "#92400e",
                    minWidth: 110,
                    flexShrink: 0,
                  }}
                >
                  {r.uacs_code}
                </span>
                <span style={{ color: "#374151" }}>{r.description}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
