import { useEffect, useLayoutEffect, useState } from "react";
import { Check, Copy, ExternalLink, ImageIcon, Scale, Trophy } from "lucide-react";
import { ComparisonResult, FocusCriterion } from "../types/comparison";
import { FOCUS_OPTIONS } from "../data/presets";
import { FireworksBurst } from "./FireworksBurst";
import { StickmanDuelArena } from "./StickmanDuelArena";

interface ActiveMatchupInfo {
  labelA: string;
  labelB: string;
  imageA: string | null;
  imageB: string | null;
}

interface VerdictStageProps {
  result: ComparisonResult | null;
  isLoading: boolean;
  elapsedSeconds: number;
  maxWaitSeconds: number;
  revealStep: 3 | 2 | 1 | null;
  revealWinner?: "A" | "B" | "TIE" | null;
  celebrateKey?: number;
  activeMatchup: ActiveMatchupInfo | null;
  onCancel: () => void;
  onSkipReveal: () => void;
  canRejudge: boolean;
  activeFocus: FocusCriterion;
  onRejudgeWithFocus: (focus: FocusCriterion) => void;
  previewImageA: string | null;
  previewImageB: string | null;
}

export function VerdictStage({
  result,
  isLoading,
  elapsedSeconds,
  maxWaitSeconds,
  revealStep,
  revealWinner = null,
  celebrateKey = 0,
  activeMatchup,
  onCancel,
  onSkipReveal,
  canRejudge,
  activeFocus,
  onRejudgeWithFocus,
  previewImageA,
  previewImageB,
}: VerdictStageProps) {
  const [copied, setCopied] = useState(false);
  const [thumbErrA, setThumbErrA] = useState(false);
  const [thumbErrB, setThumbErrB] = useState(false);
  const [animatedRatioA, setAnimatedRatioA] = useState<number>(result?.ratioA ?? 50);
  const [animatedRatioB, setAnimatedRatioB] = useState<number>(result?.ratioB ?? 50);
  const [scoreLocked, setScoreLocked] = useState(false);
  const [barSettled, setBarSettled] = useState(true);

  useEffect(() => {
    setThumbErrA(false);
  }, [previewImageA]);

  useEffect(() => {
    setThumbErrB(false);
  }, [previewImageB]);

  useLayoutEffect(() => {
    if (!result) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (celebrateKey <= 0 || prefersReducedMotion) {
      setAnimatedRatioA(result.ratioA);
      setAnimatedRatioB(result.ratioB);
      setBarSettled(true);
      setScoreLocked(false);
      return;
    }

    setAnimatedRatioA(0);
    setAnimatedRatioB(0);
    setScoreLocked(false);
    setBarSettled(false);

    const barTimer = window.setTimeout(() => {
      setBarSettled(true);
    }, 45);

    let rafId = 0;
    const duration = 640;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedRatioA(Math.round(result.ratioA * eased));
      setAnimatedRatioB(Math.round(result.ratioB * eased));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setAnimatedRatioA(result.ratioA);
        setAnimatedRatioB(result.ratioB);
        setScoreLocked(true);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(barTimer);
      window.cancelAnimationFrame(rafId);
    };
  }, [celebrateKey, result]);

  const handleCopySummary = async () => {
    if (!result) return;
    const lines = [
      `[매치 판정 결과] ${result.sideALabel} (${result.ratioA}%) vs ${result.sideBLabel} (${result.ratioB}%)`,
      `최종 판정: ${result.winnerName} (${result.ratioA} : ${result.ratioB})`,
      `핵심 결론: ${result.headlineVerdict}`,
      `요약: ${result.summaryReason}`,
      `결정적 승부처: ${result.decidingFactor}`,
      ...(result.verificationNote ? [`확인 근거 및 한계: ${result.verificationNote}`] : []),
      "",
      "[항목별 점수]",
      ...result.criteriaBreakdown.map(
        (c) => `- ${c.criterion}: A ${c.scoreA} vs B ${c.scoreB} (${c.reason})`
      ),
    ];
    const textToCopy = lines.join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    }
  };

  if (isLoading || revealStep !== null) {
    const isRevealClimax = revealStep !== null;
    const remainingSeconds = isRevealClimax
      ? revealStep
      : Math.max(4, maxWaitSeconds - elapsedSeconds);
    const criticalDigit = isRevealClimax ? revealStep : null;

    const remainingRatio = isRevealClimax
      ? revealStep / 3
      : Math.max(0.35, Math.min(1, remainingSeconds / maxWaitSeconds));

    const isDelayed = !isRevealClimax && elapsedSeconds >= 6;
    const stageStep = isRevealClimax
      ? 3
      : elapsedSeconds < 2
      ? 1
      : elapsedSeconds < 5
      ? 2
      : 3;

    const ringRadius = 56;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference * (1 - remainingRatio);

    const statusMessage = isRevealClimax
      ? criticalDigit === 3
        ? "두 후보의 점수 정합성을 최종 잠금 처리했습니다."
        : criticalDigit === 2
        ? "항목별 가중치와 결정적 승부처를 확정하는 중입니다."
        : "최종 승자와 우위 비율이 곧 공개됩니다!"
      : elapsedSeconds < 4
      ? "두 후보의 핵심 특성과 시각적 요소를 빠르게 대조하고 있습니다."
      : "세부 근거 검증과 최종 비율을 마무리하고 있습니다.";

    const labelA = activeMatchup?.labelA || "후보 A";
    const labelB = activeMatchup?.labelB || "후보 B";

    const beatMeta =
      criticalDigit === 3
        ? {
            numColor: "text-[#78B0FF]",
            glowShadow: "drop-shadow-[0_0_28px_rgba(79,139,255,0.75)]",
            ringStroke: "#4F8BFF",
            shockBorder: "border-[#4F8BFF]/90",
            flashBg: "bg-[#4F8BFF]/25",
            cardBorder: "border-[#4F8BFF]/75",
            label: "비교 데이터 잠금",
          }
        : criticalDigit === 2
        ? {
            numColor: "text-amber-300",
            glowShadow: "drop-shadow-[0_0_32px_rgba(251,191,36,0.8)]",
            ringStroke: "#FBBF24",
            shockBorder: "border-amber-400/95",
            flashBg: "bg-amber-400/25",
            cardBorder: "border-amber-400/80",
            label: "승패 비율 확정",
          }
        : criticalDigit === 1
        ? {
            numColor: "text-[#FF6B57]",
            glowShadow: "drop-shadow-[0_0_38px_rgba(255,107,87,0.92)]",
            ringStroke: "#FF6B57",
            shockBorder: "border-[#FF6B57]",
            flashBg: "bg-[#FF6B57]/30",
            cardBorder: "border-[#FF6B57]/90",
            label:
              revealWinner === "A"
                ? "후보 A 일격 피니시!"
                : revealWinner === "B"
                ? "후보 B 일격 피니시!"
                : "최종 동시 격돌!",
          }
        : null;

    return (
      <section
        id="verdict"
        aria-live="polite"
        className={`relative overflow-hidden bg-[#1A1E2B] border rounded-xl p-6 space-y-5 transition-colors duration-200 ${
          criticalDigit !== null && beatMeta
            ? beatMeta.cardBorder
            : isDelayed
            ? "border-amber-400/50"
            : "border-[#2A3042]"
        }`}
      >
        {/* Telemetry sweeping light beam */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="animate-arena-scan h-full w-1/3 bg-gradient-to-r from-transparent via-[#4F8BFF]/[0.08] to-transparent" />
        </div>

        {/* Top Bar */}
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#252B3D] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span
                className={
                  isRevealClimax
                    ? "text-[#FF8A75]"
                    : isDelayed
                    ? "text-amber-400"
                    : "text-[#6BA4FF]"
                }
              >
                {isRevealClimax
                  ? "판정 완료 · 최종 공개 카운트다운"
                  : isDelayed
                  ? "판정 정밀 검증 중"
                  : "실시간 대결 분석 중"}
              </span>
              <span className="text-[#3A4158]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#949BB0] font-mono tabular-nums">
                경과 {elapsedSeconds}초
              </span>
            </div>
            <h3 className="font-display text-lg font-bold tracking-tight text-[#F1F3F9]">
              {criticalDigit !== null && beatMeta
                ? `${beatMeta.label} · 카운트다운 ${criticalDigit}`
                : `스틱맨 A vs B 대결 판정 중 · ${remainingSeconds}초`}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isRevealClimax ? (
              <button
                type="button"
                onClick={onSkipReveal}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#4F7CFF] hover:bg-[#6089FF] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                바로 결과 보기
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 text-xs font-semibold text-[#E2E6F0] bg-[#252B3D] hover:bg-[#2F374E] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                요청 취소
              </button>
            )}
          </div>
        </div>

        {/* Center Tension Arena */}
        <div className="relative overflow-hidden bg-[#12151F] border border-[#262C3F] rounded-xl p-4 md:p-5 space-y-4">
          {/* Compact Fighter Face-Off Header (with thumbnails if photo inputs exist) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0 bg-[#171B28] border border-[#2D3B5E] rounded-lg px-3 py-2">
              {activeMatchup?.imageA && (
                <img
                  src={activeMatchup.imageA}
                  alt={labelA}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-md object-cover border border-[#4F8BFF]/50 shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#6BA4FF]">후보 A</div>
                <div className="text-xs md:text-sm font-bold text-[#F1F3F9] truncate">{labelA}</div>
              </div>
            </div>

            <span className="font-mono text-xs font-extrabold text-[#7A8299] px-1">VS</span>

            <div className="flex items-center justify-end gap-2.5 min-w-0 bg-[#171B28] border border-[#4C2F37] rounded-lg px-3 py-2 text-right">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#FF8A75]">후보 B</div>
                <div className="text-xs md:text-sm font-bold text-[#F1F3F9] truncate">{labelB}</div>
              </div>
              {activeMatchup?.imageB && (
                <img
                  src={activeMatchup.imageB}
                  alt={labelB}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-md object-cover border border-[#FF6B57]/50 shrink-0"
                />
              )}
            </div>
          </div>

          {/* Persistent 60fps Stickman Battle Canvas + Transparent 3-2-1 Climax Overlay */}
          <div className="relative">
            <StickmanDuelArena
              labelA={labelA}
              labelB={labelB}
              imageA={activeMatchup?.imageA ?? null}
              imageB={activeMatchup?.imageB ?? null}
              intense={criticalDigit !== null}
              finisherWinner={criticalDigit === 1 ? revealWinner : null}
              countdownBadge={criticalDigit === null ? remainingSeconds : null}
            />

            {criticalDigit !== null && beatMeta && (
              <div
                key={`climax-overlay-${criticalDigit}`}
                className={`animate-stage-recoil pointer-events-none absolute inset-0 rounded-xl flex flex-col items-center ${
                  criticalDigit === 1 ? "justify-start pt-1.5" : "justify-center p-4"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center ${
                    criticalDigit === 1 ? "w-16 h-16 md:w-20 md:h-20" : "w-32 h-32 md:w-40 md:h-40"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`animate-flash-burst absolute inset-1 rounded-full blur-2xl ${beatMeta.flashBg}`}
                  />
                  <div
                    aria-hidden="true"
                    className={`animate-shockwave-ring absolute inset-2 rounded-full border-2 ${beatMeta.shockBorder}`}
                  />
                  <div
                    aria-hidden="true"
                    className={`animate-shockwave-ring-outer absolute inset-2 rounded-full border ${beatMeta.shockBorder}`}
                  />
                  <svg
                    className={`${
                      criticalDigit === 1
                        ? "w-16 h-16 md:w-20 md:h-20"
                        : "w-32 h-32 md:w-36 md:h-36"
                    } -rotate-90 opacity-90`}
                    viewBox="0 0 128 128"
                    aria-hidden="true"
                  >
                    <circle
                      cx="64"
                      cy="64"
                      r={ringRadius}
                      fill="none"
                      stroke="#1D2234"
                      strokeOpacity="0.55"
                      strokeWidth="7"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r={ringRadius}
                      fill="none"
                      stroke={beatMeta.ringStroke}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      className="transition-[stroke-dashoffset,stroke] duration-300 ease-out"
                    />
                  </svg>

                  <div className="animate-countdown-slam absolute inset-0 flex items-center justify-center select-none">
                    <span
                      className={`font-mono tabular-nums font-extrabold leading-none tracking-tighter ${
                        criticalDigit === 1
                          ? "text-[3.25rem] md:text-[3.85rem]"
                          : "text-[6rem] md:text-[7rem]"
                      } ${beatMeta.numColor} ${beatMeta.glowShadow}`}
                    >
                      {criticalDigit}
                    </span>
                  </div>
                </div>

                <div className="mt-0.5 flex flex-col items-center gap-1 w-44">
                  <span className="text-[11px] md:text-xs font-extrabold text-[#F1F3F9] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    {beatMeta.label}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 w-full">
                    {([3, 2, 1] as const).map((beat) => {
                      const isCurrent = criticalDigit === beat;
                      const isPassed = criticalDigit < beat;
                      return (
                        <div
                          key={beat}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            isCurrent
                              ? beat === 3
                                ? "bg-[#4F8BFF] scale-y-125"
                                : beat === 2
                                ? "bg-amber-400 scale-y-125"
                                : "bg-[#FF6B57] scale-y-125"
                              : isPassed
                              ? "bg-emerald-400/75"
                              : "bg-[#22283B]/80"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Animated Tug-of-War Clash Equilibrium Track */}
          <div className="relative space-y-2">
            <div className="relative h-6 rounded-lg bg-[#1A1E2B] border border-[#2B3247] overflow-hidden flex items-center">
              <div className="w-1/2 h-full bg-gradient-to-r from-[#4F8BFF]/35 via-[#4F8BFF]/65 to-[#4F8BFF]/95" />
              <div className="w-1/2 h-full bg-gradient-to-l from-[#FF6B57]/35 via-[#FF6B57]/65 to-[#FF6B57]/95" />
              <div
                aria-hidden="true"
                className={`absolute left-1/2 -ml-5 top-0 bottom-0 w-10 flex items-center justify-center ${
                  criticalDigit !== null
                    ? "animate-clash-tug-intense"
                    : "animate-clash-tug"
                }`}
              >
                <div className="w-2 h-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)]" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-[#949BB0]">
              <span>{statusMessage}</span>
              <span className="font-mono tabular-nums shrink-0 text-[#7A8299]">
                {isRevealClimax
                  ? `${criticalDigit} / 3`
                  : `${remainingSeconds}s / ${maxWaitSeconds}s`}
              </span>
            </div>
          </div>

          {/* Stage Progress Indicator */}
          <div className="relative grid grid-cols-3 gap-2 pt-1">
            {[
              { id: 1, label: "01. 후보 특징 추출" },
              { id: 2, label: "02. 기준별 대조 채점" },
              { id: 3, label: "03. 최종 비율 확정" },
            ].map((step) => {
              const active = stageStep === step.id;
              const done = stageStep > step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-md border px-3 py-2 text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-[#4F8BFF]/60 bg-[#4F8BFF]/15 text-[#F1F3F9]"
                      : done
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                      : "border-[#252B3D] bg-[#161A26] text-[#687089]"
                  }`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section
        id="verdict"
        className="bg-[#1A1E2B]/70 border border-dashed border-[#2B3247] rounded-xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#222738] border border-[#303850] flex items-center justify-center text-[#8FA8FF] shrink-0">
            <Scale className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-0.5 text-left">
            <h3 className="text-sm font-bold text-[#E2E6F0]">
              판정 결과 리포트 대기 중
            </h3>
            <p className="text-xs text-[#8E96AD]">
              좌측 예시를 클릭하거나 위 입력창에서 두 후보를 입력해 비교를 시작하세요.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const verdictLabel =
    result.winner === "A"
      ? "후보 A 승리"
      : result.winner === "B"
      ? "후보 B 승리"
      : "팽팽한 무승부";

  const verdictColor =
    result.winner === "A"
      ? "text-[#6BA4FF]"
      : result.winner === "B"
      ? "text-[#FF8A75]"
      : "text-[#B8C0D4]";

  return (
    <>
      <FireworksBurst triggerKey={celebrateKey} winner={result.winner} />

      <section
        id="verdict"
        key={`verdict-${celebrateKey}-${result.sideALabel}-${result.sideBLabel}`}
        aria-live="polite"
        className="animate-result-reveal relative bg-[#1A1E2B] border border-[#2A3042] rounded-xl overflow-hidden"
      >
        {/* Top Verdict Banner */}
        <div className="relative p-6 border-b border-[#252B3D] space-y-6 overflow-hidden">
          {celebrateKey > 0 && (
            <>
              <div
                key={`verdict-flash-${celebrateKey}`}
                aria-hidden="true"
                className={`animate-flash-burst pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[32rem] h-56 rounded-full blur-3xl ${
                  result.winner === "A"
                    ? "bg-[#4F8BFF]/35"
                    : result.winner === "B"
                    ? "bg-[#FF6B57]/35"
                    : "bg-emerald-400/25"
                }`}
              />
              <div
                key={`verdict-ring-${celebrateKey}`}
                aria-hidden="true"
                className={`animate-shockwave-ring pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full border-2 ${
                  result.winner === "A"
                    ? "border-[#6BA4FF]/45"
                    : result.winner === "B"
                    ? "border-[#FF8A75]/45"
                    : "border-emerald-300/35"
                }`}
              />
              <div
                key={`verdict-sheen-${celebrateKey}`}
                aria-hidden="true"
                className="animate-sheen-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
            </>
          )}
          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={verdictColor}>{verdictLabel}</span>
              <span className="text-[#3A4158]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#949BB0]">
                {FOCUS_OPTIONS.find((f) => f.id === activeFocus)?.label ?? "종합 평가"} 기준
              </span>
            </div>
            <h2 className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-[#F1F3F9] [text-wrap:balance]">
              {result.winner === "TIE"
                ? `${result.sideALabel} 대 ${result.sideBLabel}, 50 : 50 동률`
                : `${result.winnerName} — ${
                    result.ratioA > result.ratioB ? result.ratioA : result.ratioB
                  } : ${
                    result.ratioA > result.ratioB ? result.ratioB : result.ratioA
                  } 우위`}
            </h2>
            <p className="text-sm font-medium text-[#C8CFDF] leading-relaxed">
              {result.headlineVerdict}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#E2E6F0] bg-[#252B3D] hover:bg-[#2F374E] border border-[#343C54] rounded-lg transition-colors whitespace-nowrap shrink-0 self-start"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                복사됨
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                결과 복사
              </>
            )}
          </button>
        </div>

        {/* Scoreboard Ratio Visualization */}
        {(() => {
          const isAWin = result.winner === "A";
          const isBWin = result.winner === "B";
          const isTie = result.winner === "TIE";

          const panelAClass = isAWin
            ? "bg-[#192138] border-[#4F8BFF]/80 shadow-[0_0_24px_rgba(79,139,255,0.16)]"
            : isBWin
            ? "bg-[#13151C] border-[#232734] grayscale opacity-50"
            : "bg-[#171C2B] border-[#4A5778]/70";

          const panelBClass = isBWin
            ? "bg-[#261A24] border-[#FF6B57]/80 shadow-[0_0_24px_rgba(255,107,87,0.16)]"
            : isAWin
            ? "bg-[#13151C] border-[#232734] grayscale opacity-50"
            : "bg-[#171C2B] border-[#4A5778]/70";

          const barWidthA = celebrateKey > 0 && !barSettled ? 50 : result.ratioA;
          const barWidthB = celebrateKey > 0 && !barSettled ? 50 : result.ratioB;

          return (
            <div className="bg-[#12151F] border border-[#262C3F] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
                {/* Side A Scoreboard Panel */}
                <div
                  className={`relative overflow-hidden flex items-center gap-3 min-w-0 rounded-xl p-3 border transition-all duration-300 ${panelAClass}`}
                >
                  {celebrateKey > 0 && (isAWin || isTie) && (
                    <div
                      key={`panel-a-sheen-${celebrateKey}`}
                      aria-hidden="true"
                      className="animate-sheen-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    />
                  )}
                  {previewImageA && !thumbErrA ? (
                    <img
                      src={previewImageA}
                      alt={result.sideALabel}
                      referrerPolicy="no-referrer"
                      onError={() => setThumbErrA(true)}
                      className={`relative w-12 h-12 rounded-lg object-cover shrink-0 border ${
                        isAWin
                          ? "border-[#4F8BFF]"
                          : isBWin
                          ? "border-[#2F3442] grayscale brightness-75"
                          : "border-[#566384]"
                      }`}
                    />
                  ) : previewImageA ? (
                    <div className="relative w-12 h-12 rounded-lg bg-[#1A1E2B] border border-[#2F374E] flex items-center justify-center text-[#7A8299] shrink-0">
                      <ImageIcon className="w-4 h-4" aria-hidden="true" />
                    </div>
                  ) : null}
                  <div className="relative min-w-0">
                    <div
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        isAWin
                          ? "text-[#78B0FF]"
                          : isBWin
                          ? "text-[#7D8394]"
                          : "text-[#9AB4EB]"
                      }`}
                    >
                      {isAWin && (
                        <Trophy
                          className={`w-3.5 h-3.5 shrink-0 ${
                            celebrateKey > 0 ? "animate-trophy-pop" : ""
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        후보 A {isAWin ? "· 우승" : isBWin ? "· 패배" : "· 동률"}
                      </span>
                    </div>
                    <div
                      className={`text-sm md:text-base font-bold truncate ${
                        isBWin ? "text-[#9DA3B3]" : "text-[#F1F3F9]"
                      }`}
                    >
                      {result.sideALabel}
                    </div>
                  </div>
                </div>

                {/* Center Ratio Score */}
                <div className="relative font-mono tabular-nums text-3xl md:text-4xl font-extrabold tracking-tight text-center shrink-0 px-3 py-1">
                  {celebrateKey > 0 && (
                    <div
                      key={`score-halo-${celebrateKey}`}
                      aria-hidden="true"
                      className={`animate-flash-burst pointer-events-none absolute inset-0 rounded-full blur-xl ${
                        isAWin
                          ? "bg-[#4F8BFF]/35"
                          : isBWin
                          ? "bg-[#FF6B57]/35"
                          : "bg-emerald-400/25"
                      }`}
                    />
                  )}
                  <span
                    className={`relative inline-block ${
                      isAWin
                        ? "text-[#6BA4FF] drop-shadow-[0_0_18px_rgba(79,139,255,0.55)]"
                        : isBWin
                        ? "text-[#6E7587]"
                        : "text-[#82B0FF]"
                    } ${
                      celebrateKey > 0 && scoreLocked && (isAWin || isTie)
                        ? "animate-score-lock"
                        : ""
                    }`}
                  >
                    {animatedRatioA}
                  </span>
                  <span className="relative text-[#3E465F] mx-2">:</span>
                  <span
                    className={`relative inline-block ${
                      isBWin
                        ? "text-[#FF8A75] drop-shadow-[0_0_18px_rgba(255,107,87,0.55)]"
                        : isAWin
                        ? "text-[#6E7587]"
                        : "text-[#FF9582]"
                    } ${
                      celebrateKey > 0 && scoreLocked && (isBWin || isTie)
                        ? "animate-score-lock"
                        : ""
                    }`}
                  >
                    {animatedRatioB}
                  </span>
                </div>

                {/* Side B Scoreboard Panel */}
                <div
                  className={`relative overflow-hidden flex items-center justify-end gap-3 min-w-0 text-right rounded-xl p-3 border transition-all duration-300 ${panelBClass}`}
                >
                  {celebrateKey > 0 && (isBWin || isTie) && (
                    <div
                      key={`panel-b-sheen-${celebrateKey}`}
                      aria-hidden="true"
                      className="animate-sheen-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    />
                  )}
                  <div className="relative min-w-0">
                    <div
                      className={`inline-flex items-center justify-end gap-1 text-xs font-bold ${
                        isBWin
                          ? "text-[#FF8A75]"
                          : isAWin
                          ? "text-[#7D8394]"
                          : "text-[#F5A394]"
                      }`}
                    >
                      <span>
                        {isBWin ? "우승 · " : isAWin ? "패배 · " : "동률 · "}후보 B
                      </span>
                      {isBWin && (
                        <Trophy
                          className={`w-3.5 h-3.5 shrink-0 ${
                            celebrateKey > 0 ? "animate-trophy-pop" : ""
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div
                      className={`text-sm md:text-base font-bold truncate ${
                        isAWin ? "text-[#9DA3B3]" : "text-[#F1F3F9]"
                      }`}
                    >
                      {result.sideBLabel}
                    </div>
                  </div>
                  {previewImageB && !thumbErrB ? (
                    <img
                      src={previewImageB}
                      alt={result.sideBLabel}
                      referrerPolicy="no-referrer"
                      onError={() => setThumbErrB(true)}
                      className={`relative w-12 h-12 rounded-lg object-cover shrink-0 border ${
                        isBWin
                          ? "border-[#FF6B57]"
                          : isAWin
                          ? "border-[#2F3442] grayscale brightness-75"
                          : "border-[#566384]"
                      }`}
                    />
                  ) : previewImageB ? (
                    <div className="relative w-12 h-12 rounded-lg bg-[#1A1E2B] border border-[#2F374E] flex items-center justify-center text-[#7A8299] shrink-0">
                      <ImageIcon className="w-4 h-4" aria-hidden="true" />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Dual Proportion Bar with 50% equilibrium tick */}
              <div className="relative overflow-hidden rounded-lg">
                <div
                  className={`h-8 w-full rounded-lg overflow-hidden flex bg-[#1A1E2B] border ${
                    isTie ? "border-[#536082]" : "border-[#2A3042]"
                  }`}
                  role="img"
                  aria-label={`후보 A ${result.ratioA}% 대 후보 B ${result.ratioB}% 비율 그래프`}
                >
                  <div
                    style={{ width: `${barWidthA}%` }}
                    className={`flex items-center justify-start px-3 font-mono tabular-nums text-xs font-bold transition-[width] duration-700 ease-out overflow-hidden whitespace-nowrap ${
                      isBWin
                        ? "bg-[#303542] text-[#8E96A8]"
                        : isTie
                        ? "bg-[#4F8BFF]/85 text-[#0D1017]"
                        : "bg-[#4F8BFF] text-[#0D1017]"
                    }`}
                  >
                    {animatedRatioA >= 14 ? `${animatedRatioA}%` : ""}
                  </div>
                  <div className="w-[2px] bg-[#12151F] shrink-0" aria-hidden="true" />
                  <div
                    style={{ width: `${barWidthB}%` }}
                    className={`flex items-center justify-end px-3 font-mono tabular-nums text-xs font-bold transition-[width] duration-700 ease-out overflow-hidden whitespace-nowrap ${
                      isAWin
                        ? "bg-[#303542] text-[#8E96A8]"
                        : isTie
                        ? "bg-[#FF6B57]/85 text-[#0D1017]"
                        : "bg-[#FF6B57] text-[#0D1017]"
                    }`}
                  >
                    {animatedRatioB >= 14 ? `${animatedRatioB}%` : ""}
                  </div>
                </div>
                {celebrateKey > 0 && (
                  <div
                    key={`bar-sheen-${celebrateKey}`}
                    aria-hidden="true"
                    className="animate-sheen-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  />
                )}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/40"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#7A8299] tabular-nums">
                <span>A · {animatedRatioA}%</span>
                <span>50 : 50 균형</span>
                <span>{animatedRatioB}% · B</span>
              </div>
            </div>
          );
        })()}

        {/* Summary & Deciding Factor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-1.5">
            <h3 className="text-xs font-semibold text-[#949BB0]">종합 판정 이유</h3>
            <p className="text-sm text-[#D6DCEB] leading-relaxed">
              {result.summaryReason}
            </p>
          </div>
          <div className="space-y-1.5 bg-[#12151F] rounded-lg p-4 border border-[#262C3F]">
            <h3 className="text-xs font-semibold text-[#949BB0]">결정적 승부처</h3>
            <p className="text-sm font-semibold text-[#F1F3F9] leading-relaxed">
              {result.decidingFactor}
            </p>
          </div>
        </div>

        {/* Re-judge under different focus */}
        {canRejudge && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#252B3D]">
            <span className="text-xs font-medium text-[#949BB0]">
              다른 기준으로 재판정
            </span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#12151F] border border-[#262C3F] rounded-lg">
              {FOCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onRejudgeWithFocus(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                    activeFocus === opt.id
                      ? "bg-[#4F7CFF] text-white"
                      : "text-[#949BB0] hover:text-[#F1F3F9]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Criteria Breakdown Table */}
      <div className="p-6 border-b border-[#252B3D] space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-[#F1F3F9]">
            항목별 세부 점수 비교
          </h3>
          <span className="text-xs text-[#7A8299] font-mono tabular-nums">
            10.0점 만점
          </span>
        </div>

        <div className="divide-y divide-[#252B3D] border-t border-b border-[#252B3D]">
          {result.criteriaBreakdown.map((item, idx) => {
            const edgeText =
              item.edge === "A"
                ? "A 우세"
                : item.edge === "B"
                ? "B 우세"
                : "동점";
            const edgeColor =
              item.edge === "A"
                ? "text-[#6BA4FF]"
                : item.edge === "B"
                ? "text-[#FF8A75]"
                : "text-[#949BB0]";
            const pctA = Math.min(100, Math.max(0, (item.scoreA / 10) * 100));
            const pctB = Math.min(100, Math.max(0, (item.scoreB / 10) * 100));

            return (
              <div
                key={`${item.criterion}-${idx}`}
                className="py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
              >
                <div className="lg:col-span-3 flex items-center justify-between lg:block gap-2">
                  <div className="text-sm font-bold text-[#F1F3F9]">
                    {item.criterion}
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${edgeColor}`}>
                    {edgeText}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#6BA4FF] w-5 shrink-0">
                      A
                    </span>
                    <div className="flex-1 h-2 bg-[#12151F] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pctA}%` }}
                        className="h-full bg-[#4F8BFF] rounded-full"
                      />
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-[#F1F3F9] w-9 text-right shrink-0">
                      {item.scoreA.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#FF8A75] w-5 shrink-0">
                      B
                    </span>
                    <div className="flex-1 h-2 bg-[#12151F] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pctB}%` }}
                        className="h-full bg-[#FF6B57] rounded-full"
                      />
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-[#F1F3F9] w-9 text-right shrink-0">
                      {item.scoreB.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 text-sm text-[#C8CFDF] leading-relaxed">
                  {item.reason}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Strengths + Practical Guide + Verification */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div
            className={`rounded-xl p-4 border space-y-3 transition-all duration-300 ${
              result.winner === "A"
                ? "bg-[#182034] border-[#4F8BFF]/55 shadow-[0_0_20px_rgba(79,139,255,0.08)]"
                : result.winner === "B"
                ? "bg-[#14161D] border-[#222633] grayscale opacity-55"
                : "bg-[#171C2A] border-[#384360]"
            }`}
          >
            <h4 className="text-sm font-bold text-[#F1F3F9] flex items-center gap-2">
              {result.winner === "A" ? (
                <Trophy className="w-3.5 h-3.5 text-[#6BA4FF] shrink-0" aria-hidden="true" />
              ) : (
                <span className="w-2 h-2 rounded-xs bg-[#4F8BFF]" aria-hidden="true" />
              )}
              <span>{result.sideALabel}의 핵심 강점</span>
            </h4>
            <ul className="space-y-2 border-t border-[#252B3D] pt-3">
              {result.sideAStrengths.map((point, idx) => (
                <li
                  key={idx}
                  className="text-sm text-[#C8CFDF] leading-relaxed flex items-start gap-2.5"
                >
                  <span className="font-mono text-xs text-[#6BA4FF] font-semibold mt-0.5 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`rounded-xl p-4 border space-y-3 transition-all duration-300 ${
              result.winner === "B"
                ? "bg-[#251A22] border-[#FF6B57]/55 shadow-[0_0_20px_rgba(255,107,87,0.08)]"
                : result.winner === "A"
                ? "bg-[#14161D] border-[#222633] grayscale opacity-55"
                : "bg-[#171C2A] border-[#384360]"
            }`}
          >
            <h4 className="text-sm font-bold text-[#F1F3F9] flex items-center gap-2">
              {result.winner === "B" ? (
                <Trophy className="w-3.5 h-3.5 text-[#FF8A75] shrink-0" aria-hidden="true" />
              ) : (
                <span className="w-2 h-2 rounded-xs bg-[#FF6B57]" aria-hidden="true" />
              )}
              <span>{result.sideBLabel}의 핵심 강점</span>
            </h4>
            <ul className="space-y-2 border-t border-[#252B3D] pt-3">
              {result.sideBStrengths.map((point, idx) => (
                <li
                  key={idx}
                  className="text-sm text-[#C8CFDF] leading-relaxed flex items-start gap-2.5"
                >
                  <span className="font-mono text-xs text-[#FF8A75] font-semibold mt-0.5 tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#252B3D] pt-5 space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-[#949BB0]">상황별 선택 가이드</h4>
            <p className="text-sm text-[#D6DCEB] leading-relaxed">
              {result.recommendation}
            </p>
          </div>

          {result.verificationNote && (
            <div className="bg-[#12151F] rounded-lg p-4 border border-[#262C3F] space-y-1.5">
              <h4 className="text-xs font-semibold text-[#949BB0]">
                확인 근거 및 판단 한계
              </h4>
              <p className="text-xs text-[#949BB0] leading-relaxed">
                {result.verificationNote}
              </p>
            </div>
          )}

          {result.sources && result.sources.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-semibold text-[#949BB0]">
                참고한 웹 검색 출처
              </h4>
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {result.sources.map((src, idx) => (
                  <li key={`${src.uri}-${idx}`}>
                    <a
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#6BA4FF] hover:underline"
                    >
                      <span className="truncate max-w-[240px]">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      </section>
    </>
  );
}
