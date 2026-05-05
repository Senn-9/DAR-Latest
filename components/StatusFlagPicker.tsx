"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RiFlagLine,
  RiCloseLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiAlertLine,
  RiCloseCircleLine,
  RiPauseLine,
  RiTimeLine,
} from "react-icons/ri";

// Database-driven flag type
type FlagOption = {
  id: number;
  label: string;
  slug: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
};

// Legacy StatusFlag enum for backward compatibility
export type StatusFlag =
  | "all"
  | "no_flag"
  | "complete"
  | "incomplete_info"
  | "wrong_information"
  | "needs_revision"
  | "on_hold"
  | "urgent";

// Helper to convert flag name to slug
const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "_");

// Icon mapper for flag slugs
function iconForSlug(slug: string) {
  switch (slug) {
    case "complete":
      return <RiCheckboxCircleLine size={18} />;
    case "incomplete_info":
      return <RiAlertLine size={18} />;
    case "wrong_information":
      return <RiCloseCircleLine size={18} />;
    case "needs_revision":
      return <RiErrorWarningLine size={18} />;
    case "on_hold":
      return <RiPauseLine size={18} />;
    case "urgent":
      return <RiTimeLine size={18} />;
    case "no_flag":
      return <RiFlagLine size={18} />;
    default:
      return <RiFlagLine size={18} />;
  }
}

// Color config for flag slugs
const FLAG_COLORS: Record<string, { color: string; bgColor: string }> = {
  no_flag: { color: "text-gray-500", bgColor: "bg-gray-50" },
  complete: { color: "text-green-600", bgColor: "bg-green-50" },
  incomplete_info: { color: "text-yellow-600", bgColor: "bg-yellow-50" },
  wrong_information: { color: "text-red-600", bgColor: "bg-red-50" },
  needs_revision: { color: "text-orange-600", bgColor: "bg-orange-50" },
  on_hold: { color: "text-blue-600", bgColor: "bg-blue-50" },
  urgent: { color: "text-purple-600", bgColor: "bg-purple-50" },
};

// Legacy FLAG_CONFIG for backward compatibility
export const FLAG_CONFIG: Record<StatusFlag, { label: string; color: string; bgColor: string }> = {
  all: { label: "All Flags", color: "text-gray-600", bgColor: "bg-gray-100" },
  no_flag: { label: "No Flag", color: "text-gray-500", bgColor: "bg-gray-50" },
  complete: { label: "Complete", color: "text-green-600", bgColor: "bg-green-50" },
  incomplete_info: { label: "Incomplete Info", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  wrong_information: { label: "Wrong Information", color: "text-red-600", bgColor: "bg-red-50" },
  needs_revision: { label: "Needs Revision", color: "text-orange-600", bgColor: "bg-orange-50" },
  on_hold: { label: "On Hold", color: "text-blue-600", bgColor: "bg-blue-50" },
  urgent: { label: "Urgent", color: "text-purple-600", bgColor: "bg-purple-50" },
};

// Legacy STATUS_FLAGS for backward compatibility
export const STATUS_FLAGS: StatusFlag[] = [
  "all",
  "no_flag",
  "complete",
  "incomplete_info",
  "wrong_information",
  "needs_revision",
  "on_hold",
  "urgent",
];

// Legacy getFlagId for backward compatibility
export function getFlagId(flag: StatusFlag | null): number | null {
  if (!flag || flag === "all") return null;
  const FLAG_TO_ID: Record<StatusFlag, number | null> = {
    all: null,
    no_flag: 1,
    complete: 2,
    incomplete_info: 3,
    wrong_information: 4,
    needs_revision: 5,
    on_hold: 6,
    urgent: 7,
  };
  return FLAG_TO_ID[flag];
}

// Hook to fetch flags from database
export function useFlagOptions() {
  const supabase = createClient();
  const [flagOptions, setFlagOptions] = useState<FlagOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("status_flag")
        .select("id, flag_name")
        .order("id", { ascending: true });

      const opts: FlagOption[] = (data || []).map((row: { id: number; flag_name: string | null }) => {
        const slug = toSlug(row.flag_name || "");
        const colors = FLAG_COLORS[slug] || { color: "text-gray-500", bgColor: "bg-gray-50" };

        return {
          id: row.id,
          label: row.flag_name || "Unknown",
          slug,
          description:
            row.flag_name === "Complete"
              ? "All information is correct and complete."
              : row.flag_name === "Incomplete Info"
              ? "Required fields or attachments are missing."
              : row.flag_name === "Wrong Information"
              ? "Submitted data contains errors that must be corrected."
              : row.flag_name === "Needs Revision"
              ? "Minor corrections needed before forwarding."
              : row.flag_name === "On Hold"
              ? "Processing paused pending clarification."
              : row.flag_name === "Urgent"
              ? "Requires immediate attention."
              : "Leave flag unset",
          icon: iconForSlug(slug),
          iconBg: colors.bgColor,
          iconColor: colors.color,
        };
      });

      setFlagOptions(opts);
      setLoading(false);
    };

    fetchFlags();
  }, [supabase]);

  return { flagOptions, loading };
}

// Props for the database-driven FlagButton
interface DBFlagButtonProps {
  selectedFlagId: number | null;
  onPress: () => void;
  flagOptions: FlagOption[];
}

export function DBFlagButton({ selectedFlagId, onPress, flagOptions }: DBFlagButtonProps) {
  const selectedFlag = flagOptions.find((f) => f.id === selectedFlagId);

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          selectedFlag?.iconBg || "bg-gray-50"
        } ${selectedFlag?.iconColor || "text-gray-500"}`}
      >
        {selectedFlag?.icon || <RiFlagLine size={18} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">
          {selectedFlag?.label || "Select Flag"}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {selectedFlag?.description || "Choose a status flag for this record"}
        </p>
      </div>
      <svg
        className="w-4 h-4 text-gray-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

// FlagButton for backward compatibility (StatusFlag based)
interface FlagButtonProps {
  selected: StatusFlag | null;
  onPress: () => void;
}

export function FlagButton({ selected, onPress }: FlagButtonProps) {
  const config = selected ? FLAG_CONFIG[selected] : FLAG_CONFIG.no_flag;
  const label = selected ? config.label : "Set Flag";

  return (
    <button
      onClick={onPress}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        selected
          ? `${config.bgColor} ${config.color} border-current`
          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
      }`}
    >
      <RiFlagLine size={16} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

// Database-driven Status Flag Picker Modal
interface DBStatusFlagPickerProps {
  visible: boolean;
  selectedFlagId: number | null;
  onSelect: (flagId: number) => void;
  onClose: () => void;
  flagOptions: FlagOption[];
}

export function DBStatusFlagPicker({
  visible,
  selectedFlagId,
  onSelect,
  onClose,
  flagOptions,
}: DBStatusFlagPickerProps) {
  if (!visible) return null;

  const handleSelect = (flagId: number) => {
    onSelect(flagId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Modal header */}
        <div className="px-5 py-4 bg-gray-800 text-white flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Processing Flag</p>
            <p className="text-base font-bold mt-0.5">Select Status Flag</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        {/* Options */}
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {flagOptions.map((flag) => {
            const isSelected = selectedFlagId === flag.id;
            return (
              <button
                key={flag.id}
                type="button"
                onClick={() => handleSelect(flag.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                  isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${flag.iconBg} ${flag.iconColor}`}
                >
                  {flag.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{flag.label}</p>
                  <p className="text-xs text-gray-400">{flag.description}</p>
                </div>
                {isSelected && (
                  <RiCheckboxCircleLine size={18} className="text-emerald-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// StatusFlagPicker for backward compatibility
interface StatusFlagPickerProps {
  visible: boolean;
  selected: StatusFlag | null;
  onSelect: (flag: StatusFlag | null) => void;
  onClose: () => void;
}

export function StatusFlagPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: StatusFlagPickerProps) {
  if (!visible) return null;

  const handleSelect = (flag: StatusFlag) => {
    onSelect(flag === "no_flag" ? null : flag);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Select Status Flag</h2>
              <p className="text-sm text-emerald-100 mt-0.5">Mark this record with a status flag</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <RiCloseLine size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {STATUS_FLAGS.filter((f) => f !== "all").map((flag) => {
            const config = FLAG_CONFIG[flag];
            const isSelected = selected === flag;

            return (
              <button
                key={flag}
                onClick={() => handleSelect(flag)}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? `${config.bgColor} ${config.color} border-current`
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                    <RiFlagLine size={16} className={config.color} />
                  </div>
                  <span className="font-semibold">{config.label}</span>
                </div>
                {isSelected && <RiCheckLine size={20} className={config.color} />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Clear Flag
          </button>
        </div>
      </div>
    </div>
  );
}
