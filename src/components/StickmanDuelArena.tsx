import React, {useEffect, useMemo, useState} from 'react';
import {FastForward, Flame, Shield, Sparkles, Swords, Zap} from 'lucide-react';
import type {ComparisonResult} from '../types/comparison';

interface StickmanDuelArenaProps {
  result: ComparisonResult;
  imageA: string | null;
  imageB: string | null;
  onComplete: () => void;
}

type DuelPhase = 'intro' | 'clash' | 'countdown' | 'finisher' | 'ko';

export const StickmanDuelArena: React.FC<StickmanDuelArenaProps> = ({
  result,
  imageA,
  imageB,
  onComplete,
}) => {
  const [phase, setPhase] = useState<DuelPhase>('intro');
  const [countdown, setCountdown] = useState<number>(3);
  const [shakeKey, setShakeKey] = useState(0);

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    if (reducedMotion) {
      const quickTimer = window.setTimeout(onComplete, 900);
      return () => window.clearTimeout(quickTimer);
    }

    const timers: number[] = [];

    timers.push(
      window.setTimeout(() => {
        setPhase('clash');
        setShakeKey((k) => k + 1);
      }, 650),
    );

    timers.push(
      window.setTimeout(() => {
        setPhase('countdown');
        setCountdown(3);
      }, 1550),
    );

    timers.push(window.setTimeout(() => setCountdown(2), 2150));
    timers.push(window.setTimeout(() => setCountdown(1), 2750));

    timers.push(
      window.setTimeout(() => {
        setPhase('finisher');
        setShakeKey((k) => k + 1);
      }, 3350),
    );

    timers.push(
      window.setTimeout(() => {
        setPhase('ko');
        setShakeKey((k) => k + 1);
      }, 4200),
    );

    timers.push(window.setTimeout(onComplete, 5350));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [onComplete, reducedMotion]);

  const winnerIsA = result.winner === 'A';
  const winnerIsB = result.winner === 'B';
  const isTie = result.winner === 'TIE';

  const activeColor = winnerIsA ? '#4F8BFF' : winnerIsB ? '#FF5E57' : '#FBBF24';

  const posA =
    phase === 'intro'
      ? 185
      : phase === 'clash'
        ? 345
        : phase === 'countdown'
          ? 275
          : phase === 'finisher'
            ? winnerIsA
              ? 465
              : isTie
                ? 365
                : 210
            : winnerIsA
              ? 430
              : isTie
                ? 330
                : 150;

  const posB =
    phase === 'intro'
      ? 715
      : phase === 'clash'
        ? 555
        : phase === 'countdown'
          ? 625
          : phase === 'finisher'
            ? winnerIsB
              ? 435
              : isTie
                ? 535
                : 690
            : winnerIsB
              ? 470
              : isTie
                ? 570
                : 750;

  const knockedOutA = phase === 'ko' && winnerIsB;
  const knockedOutB = phase === 'ko' && winnerIsA;

  const phaseHeadline =
    phase === 'intro'
      ? '선수 입장 · 스펙 대조 개시'
      : phase === 'clash'
        ? '1차 격돌 · 핵심 기준 정면 승부'
        : phase === 'countdown'
          ? `클라이맥스 카운트다운 · ${countdown}`
          : phase === 'finisher'
            ? `결정타 발동 · ${result.finisherMove}`
            : isTie
              ? '초접전 무승부 · 우열을 가릴 수 없는 호각세!'
              : `${winnerIsA ? result.contenderAName : result.contenderBName} 결정적 승기 장악!`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div
        key={shakeKey}
        className={`relative overflow-hidden rounded-2xl border border-white/12 bg-[#171B26] p-5 sm:p-8 ${
          phase === 'clash' || phase === 'finisher' || phase === 'ko' ? 'animate-arena-shake' : ''
        }`}
      >
        {/* Top matchup header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-[#94A3B8]">
              매치 판정 아레나
            </p>
            <h2 className="mt-1 truncate text-xl font-bold text-[#F1F3F9] sm:text-2xl">
              {phaseHeadline}
            </h2>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 bg-white/6 px-4 py-2 text-xs font-semibold text-[#F1F3F9] transition-colors hover:bg-white/12"
          >
            <FastForward className="h-3.5 w-3.5" />
            결과 바로 보기
          </button>
        </div>

        {/* Contender score preview strip */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-[#4F8BFF]/25 bg-[#13161F]/80 px-3.5 py-2.5">
            {imageA ? (
              <img
                src={imageA}
                alt={result.contenderAName}
                className="h-11 w-11 shrink-0 rounded-full border-2 border-[#4F8BFF] object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#4F8BFF] bg-[#4F8BFF]/15 text-sm font-bold text-[#4F8BFF]">
                A
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#F1F3F9]">{result.contenderAName}</p>
              <p className="font-mono-tabular text-xs text-[#7DB0FF]">도전자 A</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 rounded-xl border border-[#FF5E57]/25 bg-[#13161F]/80 px-3.5 py-2.5 text-right">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#F1F3F9]">{result.contenderBName}</p>
              <p className="font-mono-tabular text-xs text-[#FF8E88]">도전자 B</p>
            </div>
            {imageB ? (
              <img
                src={imageB}
                alt={result.contenderBName}
                className="h-11 w-11 shrink-0 rounded-full border-2 border-[#FF5E57] object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#FF5E57] bg-[#FF5E57]/15 text-sm font-bold text-[#FF5E57]">
                B
              </div>
            )}
          </div>
        </div>

        {/* SVG Stickman Battle Canvas */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#10131C]">
          {/* Dramatic backdrop aura & finisher beam */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background:
                phase === 'finisher' || phase === 'ko'
                  ? `radial-gradient(circle at 50% 52%, ${activeColor}38 0%, transparent 62%)`
                  : 'radial-gradient(circle at 50% 60%, rgba(255,255,255,0.04) 0%, transparent 65%)',
            }}
          />

          {/* Countdown / Finisher / KO Dramatic Overlay */}
          {phase === 'countdown' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold tracking-widest text-[#FBBF24]">
                최종 일격 준비
              </span>
              <span className="font-mono-tabular mt-1 text-7xl font-extrabold text-white drop-shadow-[0_0_24px_rgba(251,191,36,0.75)] sm:text-8xl">
                {countdown}
              </span>
            </div>
          )}

          {(phase === 'finisher' || phase === 'ko') && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div
                className="animate-shockwave absolute h-36 w-36 rounded-full border-4"
                style={{borderColor: activeColor}}
              />
              <div
                className="animate-slash absolute h-5 w-72 rounded-full blur-[1px]"
                style={{
                  background: `linear-gradient(90deg, transparent, #FFFFFF, ${activeColor}, transparent)`,
                }}
              />
              <div
                className="animate-impact-flare absolute h-24 w-24 rounded-full"
                style={{
                  background: `radial-gradient(circle, #FFFFFF 0%, ${activeColor} 55%, transparent 75%)`,
                }}
              />
            </div>
          )}

          <svg
            viewBox="0 0 900 380"
            className="relative z-10 h-[280px] w-full sm:h-[360px]"
            role="img"
            aria-label={`${result.contenderAName} 대 ${result.contenderBName} 스틱맨 대결`}
          >
            <defs>
              <clipPath id="head-clip-a">
                <circle cx="0" cy="0" r="34" />
              </clipPath>
              <clipPath id="head-clip-b">
                <circle cx="0" cy="0" r="34" />
              </clipPath>
              <filter id="glow-a" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-b" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Arena Floor & Perspective Lines */}
            <line x1="40" y1="322" x2="860" y2="322" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
            <ellipse cx="450" cy="328" rx="340" ry="22" fill="rgba(255,255,255,0.03)" />

            {/* Energy beam during finisher */}
            {phase === 'finisher' && !isTie && (
              <line
                x1={winnerIsA ? posA + 38 : posB - 38}
                y1="195"
                x2={winnerIsA ? posB - 10 : posA + 10}
                y2="195"
                stroke={activeColor}
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.88"
              />
            )}

            {/* Clash sparks */}
            {phase === 'clash' && (
              <g transform="translate(450, 195)">
                <polygon
                  points="0,-36 10,-10 36,0 10,10 0,36 -10,10 -36,0 -10,-10"
                  fill="#FBBF24"
                  opacity="0.92"
                />
                <circle r="14" fill="#FFFFFF" opacity="0.95" />
              </g>
            )}

            {/* Stickman A (Cobalt Blue) */}
            <g
              transform={`translate(${posA}, ${knockedOutA ? 268 : 200}) rotate(${
                knockedOutA ? -72 : phase === 'finisher' && winnerIsA ? 14 : phase === 'clash' ? 10 : 0
              })`}
              style={{transition: 'transform 520ms cubic-bezier(0.16, 1, 0.3, 1)'}}
            >
              {/* Aura ring */}
              <circle
                cx="0"
                cy="-58"
                r="42"
                fill="rgba(79,139,255,0.14)"
                filter="url(#glow-a)"
              />
              {/* Shadow */}
              <ellipse cx="0" cy="122" rx="34" ry="7" fill="rgba(0,0,0,0.45)" />

              {/* Body */}
              <line x1="0" y1="-22" x2="0" y2="54" stroke="#4F8BFF" strokeWidth="8" strokeLinecap="round" />
              {/* Legs */}
              <line
                x1="0"
                y1="54"
                x2={phase === 'clash' || phase === 'finisher' ? -28 : -20}
                y2="118"
                stroke="#4F8BFF"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1="0"
                y1="54"
                x2={phase === 'clash' || phase === 'finisher' ? 34 : 22}
                y2="118"
                stroke="#4F8BFF"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Back Arm */}
              <line x1="0" y1="-4" x2="-34" y2="22" stroke="#7DB0FF" strokeWidth="7" strokeLinecap="round" />
              {/* Attacking Arm + Weapon/Energy */}
              <line
                x1="0"
                y1="-4"
                x2={phase === 'clash' || (phase === 'finisher' && winnerIsA) ? 54 : 36}
                y2={phase === 'finisher' && winnerIsA ? -12 : 10}
                stroke="#7DB0FF"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {(phase === 'clash' || phase === 'finisher') && (
                <line
                  x1="48"
                  y1={phase === 'finisher' && winnerIsA ? -14 : 8}
                  x2="96"
                  y2={phase === 'finisher' && winnerIsA ? -36 : -14}
                  stroke="#93C5FD"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              )}

              {/* Large Clear Head with Contender A Photo */}
              <g transform="translate(0, -58)">
                <circle cx="0" cy="0" r="37" fill="#13161F" stroke="#4F8BFF" strokeWidth="5" />
                {imageA ? (
                  <image
                    href={imageA}
                    x="-34"
                    y="-34"
                    width="68"
                    height="68"
                    preserveAspectRatio="xMidYMid slice"
                    clipPath="url(#head-clip-a)"
                  />
                ) : (
                  <g>
                    <circle cx="0" cy="0" r="33" fill="#1D2B4B" />
                    <text
                      x="0"
                      y="9"
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="26"
                      fontWeight="800"
                    >
                      A
                    </text>
                  </g>
                )}
                <circle cx="0" cy="0" r="35" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.5" />
              </g>
            </g>

            {/* Stickman B (Coral Red) */}
            <g
              transform={`translate(${posB}, ${knockedOutB ? 268 : 200}) rotate(${
                knockedOutB ? 72 : phase === 'finisher' && winnerIsB ? -14 : phase === 'clash' ? -10 : 0
              })`}
              style={{transition: 'transform 520ms cubic-bezier(0.16, 1, 0.3, 1)'}}
            >
              {/* Aura ring */}
              <circle
                cx="0"
                cy="-58"
                r="42"
                fill="rgba(255,94,87,0.14)"
                filter="url(#glow-b)"
              />
              {/* Shadow */}
              <ellipse cx="0" cy="122" rx="34" ry="7" fill="rgba(0,0,0,0.45)" />

              {/* Body */}
              <line x1="0" y1="-22" x2="0" y2="54" stroke="#FF5E57" strokeWidth="8" strokeLinecap="round" />
              {/* Legs */}
              <line
                x1="0"
                y1="54"
                x2={phase === 'clash' || phase === 'finisher' ? 28 : 20}
                y2="118"
                stroke="#FF5E57"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1="0"
                y1="54"
                x2={phase === 'clash' || phase === 'finisher' ? -34 : -22}
                y2="118"
                stroke="#FF5E57"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Back Arm */}
              <line x1="0" y1="-4" x2="34" y2="22" stroke="#FF8E88" strokeWidth="7" strokeLinecap="round" />
              {/* Attacking Arm + Weapon/Energy */}
              <line
                x1="0"
                y1="-4"
                x2={phase === 'clash' || (phase === 'finisher' && winnerIsB) ? -54 : -36}
                y2={phase === 'finisher' && winnerIsB ? -12 : 10}
                stroke="#FF8E88"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {(phase === 'clash' || phase === 'finisher') && (
                <line
                  x1="-48"
                  y1={phase === 'finisher' && winnerIsB ? -14 : 8}
                  x2="-96"
                  y2={phase === 'finisher' && winnerIsB ? -36 : -14}
                  stroke="#FCA5A5"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              )}

              {/* Large Clear Head with Contender B Photo */}
              <g transform="translate(0, -58)">
                <circle cx="0" cy="0" r="37" fill="#13161F" stroke="#FF5E57" strokeWidth="5" />
                {imageB ? (
                  <image
                    href={imageB}
                    x="-34"
                    y="-34"
                    width="68"
                    height="68"
                    preserveAspectRatio="xMidYMid slice"
                    clipPath="url(#head-clip-b)"
                  />
                ) : (
                  <g>
                    <circle cx="0" cy="0" r="33" fill="#4B1D24" />
                    <text
                      x="0"
                      y="9"
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="26"
                      fontWeight="800"
                    >
                      B
                    </text>
                  </g>
                )}
                <circle cx="0" cy="0" r="35" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.5" />
              </g>
            </g>
          </svg>
        </div>

        {/* Bottom impact timeline indicator */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-5">
            <span className={`inline-flex items-center gap-1.5 ${phase === 'clash' ? 'font-semibold text-white' : ''}`}>
              <Swords className="h-3.5 w-3.5 text-[#4F8BFF]" />
              정면 충돌
            </span>
            <span className={`inline-flex items-center gap-1.5 ${phase === 'countdown' ? 'font-semibold text-white' : ''}`}>
              <Zap className="h-3.5 w-3.5 text-[#FBBF24]" />
              3·2·1 카운트다운
            </span>
            <span className={`inline-flex items-center gap-1.5 ${phase === 'finisher' ? 'font-semibold text-white' : ''}`}>
              <Flame className="h-3.5 w-3.5 text-[#FF5E57]" />
              피니셔 임팩트
            </span>
            <span className={`inline-flex items-center gap-1.5 ${phase === 'ko' ? 'font-semibold text-white' : ''}`}>
              <Sparkles className="h-3.5 w-3.5 text-[#34D399]" />
              최종 판정 확정
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[#CBD5E1]">
            <Shield className="h-3.5 w-3.5" />
            잠시 후 상세 판정 리포트로 이동합니다
          </span>
        </div>
      </div>
    </div>
  );
};
