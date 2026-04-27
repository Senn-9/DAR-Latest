"use client";

import { useState } from "react";
import { RiFlagLine, RiCloseLine, RiCheckLine } from "react-icons/ri";

export type StatusFlag =
  | "all"
  | "no_flag"
  | "complete"
  | "incomplete_info"
  | "wrong_information"
  | "needs_revision"
  | "on_hold"
  | "urgent";

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

const FLAG_CONFIG: Record<
  StatusFlag,
  { label: string; color: string; bgColor: string }
> = {
  all: { label: "All Flags", color: "text-gray-600", bgColor: "bg-gray-100" },
  no_flag: {
    label: "No Flag",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
  },
  complete: {
    label: "Complete",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  incomplete_info: {
    label: "Incomplete Info",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  wrong_information: {
    label: "Wrong Information",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  needs_revision: {
    label: "Needs Revision",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  on_hold: {
    label: "On Hold",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  urgent: {
    label: "Urgent",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
};

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

export function getFlagId(flag: StatusFlag): number | null {
  return FLAG_TO_ID[flag];
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Select Status Flag</h2>
              <p className="text-sm text-emerald-100 mt-0.5">
                Mark this record with a status flag
              </p>
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
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}
                  >
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
