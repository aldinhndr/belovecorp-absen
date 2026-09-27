    import { useMemo, useState } from "react";

    const HARI_PENDEK = ["M", "S", "S", "R", "K", "J", "S"];
    const BULAN = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
    ];

    export function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
    }

    function isSameDay(a, b) {
    return dateKey(a) === dateKey(b);
    }

    function ChevronIcon({ dir = "left", className = "h-5 w-5" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
        <path
            d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        </svg>
    );
    }

    /**
     * Reusable monthly calendar.
     *
     * Props:
     * - value: Date            selected date (controlled)
     * - onChange: (Date) => void   called when a day is picked
     * - markedDates: Set<string>   date keys ("yyyy-mm-dd") to show a dot on (e.g. days with attendance)
     * - maxDate: Date           latest selectable day, defaults to today (blocks future navigation/picking)
     * - minDate: Date | null    earliest navigable month, optional
     * - className: string       extra classes on the outer card
     */
    export default function Calendar({
    value,
    onChange,
    markedDates = new Set(),
    maxDate = new Date(),
    minDate = null,
    className = "",
    }) {
    const [monthCursor, setMonthCursor] = useState(
        () => new Date((value || maxDate).getFullYear(), (value || maxDate).getMonth(), 1)
    );

    const isFutureMonth = (cursor) => {
        const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        return next > new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
    };

    const isPastLimitMonth = (cursor) => {
        if (!minDate) return false;
        const prev = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
        return prev < new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    };

    const changeMonth = (delta) => {
        setMonthCursor((m) => {
        const next = new Date(m.getFullYear(), m.getMonth() + delta, 1);
        if (delta > 0 && isFutureMonth(m)) return m;
        if (delta < 0 && isPastLimitMonth(m)) return m;
        return next;
        });
    };

    const cells = useMemo(() => {
        const year = monthCursor.getFullYear();
        const month = monthCursor.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const out = [];
        for (let i = 0; i < firstWeekday; i++) out.push(null);
        for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
        return out;
    }, [monthCursor]);

    return (
        <div className={`card ${className}`}>
        <div className="mb-3 flex items-center justify-between">
            <button
            type="button"
            onClick={() => changeMonth(-1)}
            disabled={isPastLimitMonth(monthCursor)}
            aria-label="Bulan sebelumnya"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors active:bg-neutral-100 disabled:opacity-30"
            >
            <ChevronIcon dir="left" />
            </button>
            <h2 className="text-base font-bold text-ink">
            {BULAN[monthCursor.getMonth()]} {monthCursor.getFullYear()}
            </h2>
            <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={isFutureMonth(monthCursor)}
            aria-label="Bulan berikutnya"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors active:bg-neutral-100 disabled:opacity-30"
            >
            <ChevronIcon dir="right" />
            </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
            {HARI_PENDEK.map((h, i) => (
            <div key={i} className="py-1 text-center text-[11px] font-bold text-muted">
                {h}
            </div>
            ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
            if (!d) return <div key={`b-${i}`} />;
            const key = dateKey(d);
            const isFuture = d > maxDate && !isSameDay(d, maxDate);
            const isToday = isSameDay(d, new Date());
            const isSelected = value && isSameDay(d, value);
            const hasMark = markedDates.has(key);
            return (
                <button
                type="button"
                key={key}
                disabled={isFuture}
                onClick={() => onChange?.(d)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    isSelected
                    ? "bg-accent text-white"
                    : isToday
                    ? "text-accent ring-1 ring-accent/40"
                    : isFuture
                    ? "text-stone-300"
                    : "text-ink active:bg-neutral-100"
                }`}
                >
                {d.getDate()}
                {hasMark && (
                    <span
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${
                        isSelected ? "bg-white" : "bg-accent"
                    }`}
                    />
                )}
                </button>
            );
            })}
        </div>
        </div>
    );
    }