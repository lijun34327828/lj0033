import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarDay } from "@/types";

interface CalendarProps {
  year: number;
  month: number;
  calendarDays: CalendarDay[];
  onSelectDate?: (date: string) => void;
  selectedRange?: { start: string; end: string };
  conflictDates?: string[];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

function getDayStatus(dateStr: string, calendarDays: CalendarDay[]): CalendarDay["status"] {
  return calendarDays.find((d) => d.date === dateStr)?.status || "available";
}

function isInRange(dateStr: string, range?: { start: string; end: string }): boolean {
  if (!range?.start || !range?.end) return false;
  return dateStr >= range.start && dateStr <= range.end;
}

function isConflict(dateStr: string, conflicts?: string[]): boolean {
  return conflicts?.includes(dateStr) ?? false;
}

export default function Calendar({
  year,
  month,
  calendarDays,
  onSelectDate,
  selectedRange,
  conflictDates,
  onPrevMonth,
  onNextMonth,
}: CalendarProps) {
  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const result: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = offset - 1; i >= 0; i--) {
      const d = new Date(year, month - 2, new Date(year, month - 1, 0).getDate() - i);
      result.push({
        date: formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ date: formatDate(year, month, d), day: d, isCurrentMonth: true });
    }

    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month, d);
      result.push({
        date: formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate()),
        day: d,
        isCurrentMonth: false,
      });
    }

    return result;
  }, [year, month]);

  function getDotColor(dateStr: string): string {
    if (isConflict(dateStr, conflictDates)) return "bg-crimson-500";
    const status = getDayStatus(dateStr, calendarDays);
    switch (status) {
      case "available":
        return "bg-forest-500";
      case "booked":
        return "bg-crimson-500";
      case "maintenance":
        return "bg-gray-400";
      case "blackout":
        return "bg-gray-400";
      default:
        return "bg-forest-500";
    }
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-1 rounded-lg hover:bg-earth-100 transition-all duration-200"
        >
          <ChevronLeft className="w-5 h-5 text-earth-600" />
        </button>
        <span className="font-serif text-lg font-semibold text-earth-800">
          {year}年{month}月
        </span>
        <button
          onClick={onNextMonth}
          className="p-1 rounded-lg hover:bg-earth-100 transition-all duration-200"
        >
          <ChevronRight className="w-5 h-5 text-earth-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-sm font-medium text-earth-400 py-2"
          >
            {w}
          </div>
        ))}
        {days.map((d, i) => {
          const inRange = isInRange(d.date, selectedRange);
          const isStart = d.date === selectedRange?.start;
          const isEnd = d.date === selectedRange?.end;
          const conflict = isConflict(d.date, conflictDates);
          const today = isToday(d.date);

          return (
            <button
              key={i}
              onClick={() => d.isCurrentMonth && onSelectDate?.(d.date)}
              disabled={!d.isCurrentMonth}
              className={`
                relative flex flex-col items-center justify-center py-2 rounded-lg transition-all duration-200
                ${!d.isCurrentMonth ? "text-earth-300" : "cursor-pointer hover:bg-earth-100"}
                ${inRange ? "bg-earth-200" : ""}
                ${isStart ? "bg-earth-500 text-white rounded-l-lg" : ""}
                ${isEnd ? "bg-earth-500 text-white rounded-r-lg" : ""}
                ${conflict ? "bg-crimson-500/10" : ""}
                ${today ? "ring-2 ring-earth-300" : ""}
              `}
            >
              <span className={`text-sm ${isStart || isEnd ? "text-white font-semibold" : ""}`}>
                {d.day}
              </span>
              {d.isCurrentMonth && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getDotColor(d.date)}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
