import React from 'react';
import {History, Trash2} from 'lucide-react';
import type {MatchHistoryEntry} from '../types/comparison';

interface HistorySectionProps {
  entries: MatchHistoryEntry[];
  onSelect: (entry: MatchHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  entries,
  onSelect,
  onDelete,
  onClearAll,
}) => {
  return (
    <section id="history-section" className="mt-14 border-t border-white/10 pt-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <History className="h-5 w-5 text-[#94A3B8]" />
          <h2 className="text-xl font-bold text-[#F1F3F9]">최근 판정 기록</h2>
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-[#94A3B8] transition-colors hover:text-[#FF7B75]"
          >
            전체 기록 삭제
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1B1F2B]/50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-[#CBD5E1]">아직 저장된 판정 기록이 없습니다.</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            위 입력창에서 두 후보를 비교하면 이 기기에 판정 결과가 자동으로 보관됩니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {entries.map((entry) => {
            const {result} = entry;
            const dateLabel = new Date(entry.createdAt).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={entry.id}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#1B1F2B] p-5 transition-colors hover:border-white/20"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#94A3B8]">
                    <span>{dateLabel}</span>
                    <button
                      type="button"
                      aria-label={`${result.title} 기록 삭제`}
                      onClick={() => onDelete(entry.id)}
                      className="rounded-md p-1 text-[#64748B] transition-colors hover:bg-white/6 hover:text-[#FF7B75]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    className="w-full text-left"
                  >
                    <h3 className="truncate text-base font-bold text-[#F1F3F9] group-hover:text-white">
                      {result.contenderAName} <span className="text-[#64748B]">vs</span>{' '}
                      {result.contenderBName}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[#94A3B8]">
                      {result.verdictHeadline}
                    </p>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                  <div className="font-mono-tabular flex items-center gap-2 text-sm font-bold">
                    <span className="text-[#4F8BFF]">{result.ratioA}</span>
                    <span className="text-[#64748B]">:</span>
                    <span className="text-[#FF5E57]">{result.ratioB}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    className="text-xs font-semibold text-[#CBD5E1] transition-colors hover:text-white"
                  >
                    판정 다시 보기
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
