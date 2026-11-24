import { useMemo, useState } from "react";
import { ArrowUpRight, Search, Trash2 } from "lucide-react";
import { ComparisonHistoryItem } from "../types/comparison";
import { FOCUS_OPTIONS } from "../data/presets";

interface HistorySectionProps {
  items: ComparisonHistoryItem[];
  onSelect: (item: ComparisonHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  compact?: boolean;
}

type WinnerFilter = "ALL" | "A" | "B" | "TIE";

export function HistorySection({
  items,
  onSelect,
  onDelete,
  onClearAll,
  compact = false,
}: HistorySectionProps) {
  const [filter, setFilter] = useState<WinnerFilter>("ALL");
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "ALL" && item.result.winner !== filter) return false;
      if (!q) return true;
      return (
        item.result.sideALabel.toLowerCase().includes(q) ||
        item.result.sideBLabel.toLowerCase().includes(q) ||
        item.result.headlineVerdict.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <section
      id="history"
      className={
        compact
          ? "space-y-3"
          : "bg-[#1A1E2B] border border-[#2A3042] rounded-xl p-6 space-y-4"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-[#949BB0]">최근 기록</h2>
          <span className="font-mono text-[11px] text-[#687089] tabular-nums">
            {items.length}
          </span>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-medium text-[#7A8299] hover:text-rose-400 transition-colors whitespace-nowrap shrink-0"
          >
            전체 삭제
          </button>
        )}
      </div>

      {/* Segmented Winner Filter */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#12151F] border border-[#262C3F] rounded-lg">
        {(
          [
            { id: "ALL", label: "전체" },
            { id: "A", label: "A 승" },
            { id: "B", label: "B 승" },
            { id: "TIE", label: "동률" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === tab.id
                ? "bg-[#272E42] text-[#F1F3F9]"
                : "text-[#7A8299] hover:text-[#D6DCEB]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className="relative">
          <Search
            className="w-3.5 h-3.5 text-[#687089] absolute left-2.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기록 검색..."
            className="w-full rounded-lg border border-[#262C3F] bg-[#12151F] pl-8 pr-3 py-1.5 text-xs text-[#F1F3F9] placeholder:text-[#5B637A] focus:outline-none focus:border-[#4F8BFF]/70 transition-colors"
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-6 text-center rounded-lg border border-dashed border-[#272D40] px-3">
          <p className="text-xs text-[#7A8299]">
            비교를 실행하면 결과가 여기에 저장됩니다.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-5 text-center text-xs text-[#7A8299]">
          일치하는 기록이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-[#252B3D]">
          {filteredItems.map((item) => {
            const focusLabel =
              FOCUS_OPTIONS.find((f) => f.id === item.focusCriterion)?.label ?? "종합";
            const winnerColor =
              item.result.winner === "A"
                ? "text-[#6BA4FF]"
                : item.result.winner === "B"
                ? "text-[#FF8A75]"
                : "text-[#B8C0D4]";

            return (
              <div
                key={item.id}
                className="py-2.5 group flex items-start justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="min-w-0 flex-1 text-left space-y-0.5 rounded-md p-1.5 -m-1.5 hover:bg-[#24293B] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold truncate ${winnerColor}`}>
                      {item.result.winner === "TIE"
                        ? "무승부"
                        : `${item.result.winnerName} 승`}
                    </span>
                    <span className="font-mono tabular-nums text-xs font-bold shrink-0">
                      <span className="text-[#6BA4FF]">{item.result.ratioA}</span>
                      <span className="text-[#4B5470] mx-0.5">:</span>
                      <span className="text-[#FF8A75]">{item.result.ratioB}</span>
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#E2E6F0] truncate">
                    {item.result.sideALabel} vs {item.result.sideBLabel}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#7A8299]">
                    <span>{focusLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </button>

                <div className="flex items-center shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    aria-label="결과 보기"
                    className="p-1 text-[#7A8299] hover:text-[#F1F3F9] rounded transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    aria-label="기록 삭제"
                    className="p-1 text-[#687089] hover:text-rose-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
