import React from 'react';
import {ExternalLink, RotateCcw, Swords, Trophy} from 'lucide-react';
import type {ComparisonResult} from '../types/comparison';
import {FireworksBurst} from './FireworksBurst';

interface VerdictStageProps {
  result: ComparisonResult;
  imageA: string | null;
  imageB: string | null;
  showCelebration: boolean;
  onReplayDuel: () => void;
  onNewMatch: () => void;
}

export const VerdictStage: React.FC<VerdictStageProps> = ({
  result,
  imageA,
  imageB,
  showCelebration,
  onReplayDuel,
  onNewMatch,
}) => {
  const winnerLabel =
    result.winner === 'A'
      ? `${result.contenderAName} 우세`
      : result.winner === 'B'
        ? `${result.contenderBName} 우세`
        : '무승부 (호각세)';

  const winnerAccent =
    result.winner === 'A'
      ? 'text-[#4F8BFF]'
      : result.winner === 'B'
        ? 'text-[#FF5E57]'
        : 'text-[#FBBF24]';

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <FireworksBurst winner={result.winner} active={showCelebration} />

      {/* Primary Verdict Summary */}
      <section className="rounded-2xl border border-white/12 bg-[#1B1F2B] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8]">
              <Trophy className={`h-4 w-4 ${winnerAccent}`} />
              <span>최종 판정 결과</span>
              <span aria-hidden="true">·</span>
              <span className={winnerAccent}>{winnerLabel}</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#F1F3F9] [text-wrap:balance] sm:text-3xl">
              {result.verdictHeadline}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onReplayDuel}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-xs font-semibold text-[#F1F3F9] transition-colors hover:bg-white/10"
            >
              <Swords className="h-4 w-4" />
              대결 다시 보기
            </button>
            <button
              type="button"
              onClick={onNewMatch}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4F8BFF] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#3B78F0]"
            >
              <RotateCcw className="h-4 w-4" />
              새 매치
            </button>
          </div>
        </div>

        {/* Contenders + Ratio Scoreboard */}
        <div className="mt-7 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          {/* Contender A */}
          <div className="flex items-center gap-4">
            {imageA ? (
              <img
                src={imageA}
                alt={result.contenderAName}
                className={`h-16 w-16 shrink-0 rounded-full border-2 object-cover ${
                  result.winner === 'A' ? 'border-[#4F8BFF]' : 'border-white/20'
                }`}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#4F8BFF] bg-[#4F8BFF]/15 text-xl font-extrabold text-[#4F8BFF]">
                A
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#7DB0FF]">후보 A</p>
              <h2 className="truncate text-lg font-bold text-[#F1F3F9]">{result.contenderAName}</h2>
              <p className="font-mono-tabular mt-0.5 text-3xl font-extrabold text-[#4F8BFF]">
                {result.ratioA}%
              </p>
            </div>
          </div>

          {/* Center Ratio Divider */}
          <div className="text-center">
            <p className="text-xs font-medium text-[#94A3B8]">판정 비율</p>
            <div className="font-mono-tabular mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="text-[#4F8BFF]">{result.ratioA}</span>
              <span className="mx-2 text-[#64748B]">:</span>
              <span className="text-[#FF5E57]">{result.ratioB}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-[#FBBF24]">{result.finisherMove}</p>
          </div>

          {/* Contender B */}
          <div className="flex items-center justify-end gap-4 text-right">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#FF8E88]">후보 B</p>
              <h2 className="truncate text-lg font-bold text-[#F1F3F9]">{result.contenderBName}</h2>
              <p className="font-mono-tabular mt-0.5 text-3xl font-extrabold text-[#FF5E57]">
                {result.ratioB}%
              </p>
            </div>
            {imageB ? (
              <img
                src={imageB}
                alt={result.contenderBName}
                className={`h-16 w-16 shrink-0 rounded-full border-2 object-cover ${
                  result.winner === 'B' ? 'border-[#FF5E57]' : 'border-white/20'
                }`}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#FF5E57] bg-[#FF5E57]/15 text-xl font-extrabold text-[#FF5E57]">
                B
              </div>
            )}
          </div>
        </div>

        {/* Split Bar */}
        <div
          className="mt-6 flex h-3.5 w-full overflow-hidden rounded-full bg-[#13161F]"
          role="img"
          aria-label={`비율 막대: ${result.contenderAName} ${result.ratioA}%, ${result.contenderBName} ${result.ratioB}%`}
        >
          <div
            className="h-full bg-[#4F8BFF] transition-all duration-700"
            style={{width: `${result.ratioA}%`}}
          />
          <div
            className="h-full bg-[#FF5E57] transition-all duration-700"
            style={{width: `${result.ratioB}%`}}
          />
        </div>

        {/* Deciding Reason */}
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-sm font-bold text-[#F1F3F9]">승패의 핵심 결정 이유</h3>
          <p className="mt-2 text-base leading-relaxed text-[#CBD5E1]">{result.decidingReason}</p>
        </div>
      </section>

      {/* Criteria Breakdown */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#1B1F2B] p-6 sm:p-8">
        <h2 className="text-lg font-bold text-[#F1F3F9]">기준별 세부 점수 비교</h2>
        <div className="mt-5 divide-y divide-white/8">
          {result.criteriaBreakdown.map((item, idx) => (
            <div key={`${item.criterion}-${idx}`} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#F1F3F9]">{item.criterion}</span>
                <div className="font-mono-tabular flex items-center gap-3 text-sm font-bold">
                  <span className="text-[#4F8BFF]">{item.scoreA}</span>
                  <span className="text-xs text-[#64748B]">vs</span>
                  <span className="text-[#FF5E57]">{item.scoreB}</span>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="h-2 overflow-hidden rounded-full bg-[#13161F]">
                  <div
                    className="ml-auto h-full rounded-full bg-[#4F8BFF]"
                    style={{width: `${item.scoreA}%`}}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#13161F]">
                  <div
                    className="h-full rounded-full bg-[#FF5E57]"
                    style={{width: `${item.scoreB}%`}}
                  />
                </div>
              </div>

              <p className="mt-2 text-sm text-[#94A3B8]">{item.insight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Strengths Comparison */}
      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#1B1F2B] p-6">
          <h3 className="text-base font-bold text-[#4F8BFF]">
            {result.contenderAName} 핵심 강점
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#CBD5E1]">
            {result.strengthsA.map((point, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="font-mono-tabular text-xs font-bold text-[#4F8BFF]">
                  0{idx + 1}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1B1F2B] p-6">
          <h3 className="text-base font-bold text-[#FF5E57]">
            {result.contenderBName} 핵심 강점
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#CBD5E1]">
            {result.strengthsB.map((point, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="font-mono-tabular text-xs font-bold text-[#FF5E57]">
                  0{idx + 1}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Grounding Sources (if any) */}
      {result.sources && result.sources.length > 0 && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#1B1F2B] p-6">
          <h3 className="text-sm font-bold text-[#F1F3F9]">참고 웹 출처</h3>
          <div className="mt-3 flex flex-wrap gap-4">
            {result.sources.map((src, idx) => (
              <a
                key={`${src.uri}-${idx}`}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7DB0FF] underline-offset-4 hover:underline"
              >
                <span className="max-w-[260px] truncate">{src.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
