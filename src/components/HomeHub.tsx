import React from 'react';
import {AlertCircle, ArrowRight, Loader2, RotateCcw} from 'lucide-react';
import {MATCH_PRESETS} from '../data/presets';
import type {ContenderInput, MatchHistoryEntry, MatchPreset} from '../types/comparison';
import {ContenderCard} from './ContenderCard';
import {HistorySection} from './HistorySection';

interface HomeHubProps {
  contenderA: ContenderInput;
  contenderB: ContenderInput;
  focusCriteria: string;
  isAnalyzing: boolean;
  errorMessage: string | null;
  history: MatchHistoryEntry[];
  onChangeA: (next: ContenderInput) => void;
  onChangeB: (next: ContenderInput) => void;
  onChangeCriteria: (value: string) => void;
  onApplyPreset: (preset: MatchPreset) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResetInputs: () => void;
  onSelectHistory: (entry: MatchHistoryEntry) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  contenderA,
  contenderB,
  focusCriteria,
  isAnalyzing,
  errorMessage,
  history,
  onChangeA,
  onChangeB,
  onChangeCriteria,
  onApplyPreset,
  onSubmit,
  onResetInputs,
  onSelectHistory,
  onDeleteHistory,
  onClearHistory,
}) => {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero Title */}
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold tracking-wide text-[#94A3B8]">
          사진 · 주제 다각도 비교 분석
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#F1F3F9] [text-wrap:balance] sm:text-5xl">
          두 후보 중 무엇이 더 나은지 몇 대 몇으로 판정합니다
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[#94A3B8]">
          텍스트나 사진을 올리면 핵심 기준별로 점수를 매기고, 스틱맨 대결 연출과 함께 승패의 결정적 이유를 정리해 드립니다.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-[#94A3B8]">빠른 예시</span>
        {MATCH_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={isAnalyzing}
            onClick={() => onApplyPreset(preset)}
            className="rounded-lg border border-white/10 bg-[#1B1F2B] px-3 py-1.5 text-xs font-medium text-[#CBD5E1] transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
          >
            {preset.labelA} vs {preset.labelB}
          </button>
        ))}
      </div>

      {/* Match Setup Form */}
      <form onSubmit={onSubmit} noValidate>
        <div className="grid items-stretch gap-5 md:grid-cols-2">
          <ContenderCard side="A" value={contenderA} onChange={onChangeA} disabled={isAnalyzing} />
          <ContenderCard side="B" value={contenderB} onChange={onChangeB} disabled={isAnalyzing} />
        </div>

        {/* Optional Criteria + Submit Bar */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#1B1F2B] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="mb-2 block text-sm font-medium text-[#CBD5E1]">
                중점 비교 기준 (선택)
              </span>
              <input
                type="text"
                value={focusCriteria}
                disabled={isAnalyzing}
                onChange={(e) => onChangeCriteria(e.target.value)}
                placeholder="예: 가성비, 디자인 완성도, 휴대성, 장기 만족도"
                className="w-full rounded-xl border border-white/12 bg-[#13161F] px-4 py-3 text-sm text-[#F1F3F9] placeholder-[#64748B] outline-none ring-2 ring-transparent transition-all focus:border-[#4F8BFF] focus:ring-[#4F8BFF]/25 disabled:opacity-60"
              />
            </label>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onResetInputs}
                disabled={isAnalyzing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-transparent px-4 text-sm font-medium text-[#CBD5E1] transition-colors hover:bg-white/6 hover:text-white disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                초기화
              </button>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4F8BFF] px-6 text-sm font-bold text-white transition-colors hover:bg-[#3B78F0] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    비교 판정 중...
                  </>
                ) : (
                  <>
                    판정 시작
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FF5E57]/35 bg-[#FF5E57]/10 px-4 py-3 text-sm text-[#FFB4B0]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5E57]" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </form>

      {/* Evaluation Method Info */}
      <section
        id="guide-section"
        className="mt-12 grid gap-6 border-t border-white/10 pt-10 md:grid-cols-3"
      >
        <div>
          <p className="font-mono-tabular text-xs font-semibold text-[#4F8BFF]">01</p>
          <h3 className="mt-1 text-base font-bold text-[#F1F3F9]">텍스트·사진 통합 분석</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
            제품명이나 주제만 넣어도 되고, 실제 사진을 올리면 구도·상태·마감 디테일까지 함께 비교합니다.
          </p>
        </div>
        <div>
          <p className="font-mono-tabular text-xs font-semibold text-[#FBBF24]">02</p>
          <h3 className="mt-1 text-base font-bold text-[#F1F3F9]">스틱맨 피니셔 대결</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
            두 후보 사진이 스틱맨 머리에 적용되어 3·2·1 카운트다운 후 결정타 임팩트로 승부를 연출합니다.
          </p>
        </div>
        <div>
          <p className="font-mono-tabular text-xs font-semibold text-[#FF5E57]">03</p>
          <h3 className="mt-1 text-base font-bold text-[#F1F3F9]">몇 대 몇 비율 근거</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
            단순 승패를 넘어 세부 기준별 점수와 양측 강점, 핵심 판정 사유를 한눈에 확인합니다.
          </p>
        </div>
      </section>

      <HistorySection
        entries={history}
        onSelect={onSelectHistory}
        onDelete={onDeleteHistory}
        onClearAll={onClearHistory}
      />
    </main>
  );
};
