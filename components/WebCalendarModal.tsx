"use client";

import { useCallback, useMemo, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

export interface WebCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  prCreationDates?: Date[];
  poCreationDates?: Date[];
  deliveryCreationDates?: Date[];
  paymentCreationDates?: Date[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function WebCalendarModal({
  visible,
  onClose,
  prCreationDates = [],
  poCreationDates = [],
  deliveryCreationDates = [],
  paymentCreationDates = [],
}: WebCalendarModalProps) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getCountsForDate = useCallback(
    (date: Date) => ({
      countPR: prCreationDates.filter(d => isSameDay(d, date)).length,
      countPO: poCreationDates.filter(d => isSameDay(d, date)).length,
      countDelivery: deliveryCreationDates.filter(d => isSameDay(d, date)).length,
      countPayment: paymentCreationDates.filter(d => isSameDay(d, date)).length,
    }),
    [prCreationDates, poCreationDates, deliveryCreationDates, paymentCreationDates],
  );

  if (!visible) return null;

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 bg-[#064E3B]">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <RiArrowLeftSLine size={22} className="text-white" />
            </button>
            <div className="text-center">
              <p className="text-white text-lg font-bold">{MONTH_NAMES[month]}</p>
              <p className="text-white/50 text-xs font-semibold">{year}</p>
            </div>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <RiArrowRightSLine size={22} className="text-white" />
            </button>
          </div>
          <div className="grid grid-cols-7 mt-3">
            {DAY_HEADERS.map(d => (
              <div key={d} className="flex items-center justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wide text-white/40">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="px-3 py-3">
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <div key={row} className="grid grid-cols-7 mb-1">
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) return <div key={col} className="h-14" />;

                const thisDate = new Date(year, month, day);
                const isToday = isSameDay(thisDate, today);
                const isSel = selected ? isSameDay(thisDate, selected) : false;
                const isPast = thisDate < todayMidnight;
                const hasPR = prCreationDates.some(d => isSameDay(d, thisDate));
                const hasPO = poCreationDates.some(d => isSameDay(d, thisDate));
                const hasDelivery = deliveryCreationDates.some(d => isSameDay(d, thisDate));
                const hasPayment = paymentCreationDates.some(d => isSameDay(d, thisDate));

                return (
                  <button
                    key={col}
                    onClick={() => setSelected(thisDate)}
                    className={[
                      "h-14 mx-0.5 rounded-xl flex flex-col items-center justify-center transition-colors",
                      isSel
                        ? "bg-[#064E3B]"
                        : isToday
                        ? "bg-emerald-50 border border-emerald-400"
                        : "hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "text-sm font-semibold",
                        isSel
                          ? "text-white"
                          : isToday
                          ? "text-emerald-700"
                          : isPast
                          ? "text-gray-300"
                          : "text-gray-700",
                      ].join(" ")}
                    >
                      {day}
                    </span>
                    <div className="flex gap-0.5 mt-0.5">
                      {hasPR       && <div className="w-1.5 h-1.5 bg-[#064E3B] rounded-full" />}
                      {hasPO       && <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full" />}
                      {hasDelivery && <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full" />}
                      {hasPayment  && <div className="w-1.5 h-1.5 bg-[#f97316] rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-3 justify-center">
            {[
              { color: "bg-[#064E3B]", label: "PR" },
              { color: "bg-[#8b5cf6]", label: "PO" },
              { color: "bg-[#10b981]", label: "Delivery" },
              { color: "bg-[#f97316]", label: "Payment" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 ${color} rounded-full`} />
                <span className="text-[10px] font-semibold text-gray-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Selected date label */}
          <p className="text-xs text-gray-400 mb-2 text-center">
            {selected
              ? selected.toLocaleDateString("en-PH", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Click a date to see entries"}
          </p>

          {/* Count preview */}
          {selected && (() => {
            const counts = getCountsForDate(selected);
            const hasAny =
              counts.countPR + counts.countPO + counts.countDelivery + counts.countPayment > 0;
            return (
              <div className="mb-3">
                {hasAny ? (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-[11px] font-bold text-gray-600 mb-2 text-center">
                      Entries for this date
                    </p>
                    <div className="flex justify-around">
                      {counts.countPR > 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-extrabold text-[#064E3B]">
                            {counts.countPR}
                          </span>
                          <span className="text-[10px] text-gray-500">PR</span>
                        </div>
                      )}
                      {counts.countPO > 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-extrabold text-[#8b5cf6]">
                            {counts.countPO}
                          </span>
                          <span className="text-[10px] text-gray-500">PO</span>
                        </div>
                      )}
                      {counts.countDelivery > 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-extrabold text-[#10b981]">
                            {counts.countDelivery}
                          </span>
                          <span className="text-[10px] text-gray-500">Delivery</span>
                        </div>
                      )}
                      {counts.countPayment > 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-extrabold text-[#f97316]">
                            {counts.countPayment}
                          </span>
                          <span className="text-[10px] text-gray-500">Payment</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 text-center">
                    No entries for this date
                  </p>
                )}
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { setSelected(today); setCursor(today); }}
              className="flex-1 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-colors"
            >
              Today
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#064E3B] text-white text-sm font-bold hover:bg-[#065f46] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
