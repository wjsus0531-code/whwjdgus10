import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Loader2, Play, Scale } from "lucide-react";
import { ContenderCard } from "./components/ContenderCard";
import { VerdictStage } from "./components/VerdictStage";
import { HistorySection } from "./components/HistorySection";
import { FOCUS_OPTIONS, PRESET_MATCHUPS } from "./data/presets";
import {
  ComparisonHistoryItem,
  ComparisonResult,
  ContenderInput,
  FocusCriterion,
  PresetMatchup,
} from "./types/comparison";
import { urlToProcessedImage } from "./utils/image";

const EMPTY_CONTENDER: ContenderInput = {
  text: "",
  imagePreviewUrl: null,
  imageBase64: null,
  imageMimeType: null,
  imageName: null,
};

const HISTORY_STORAGE_KEY = "match_verdict_history_v1";
const COUNTDOWN_DISPLAY_SECONDS = 10;
const REQUEST_TIMEOUT_SECONDS = 26;

function readInitialHistory(): ComparisonHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ComparisonHistoryItem =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        Boolean(item.result) &&
        typeof item.result.winner === "string" &&
        typeof item.result.sideALabel === "string" &&
        typeof item.result.sideBLabel === "string" &&
        typeof item.result.ratioA === "number" &&
        typeof item.result.ratioB === "number" &&
        Array.isArray(item.result.criteriaBreakdown) &&
        Array.isArray(item.result.sideAStrengths) &&
        Array.isArray(item.result.sideBStrengths)
    );
  } catch {
    return [];
  }
}

export default function App() {
  const [sideA, setSideA] = useState<ContenderInput>(EMPTY_CONTENDER);
  const [sideB, setSideB] = useState<ContenderInput>(EMPTY_CONTENDER);
  const [focusCriterion, setFocusCriterion] = useState<FocusCriterion>("balanced");
  const [focusDetail, setFocusDetail] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoadingPreset, setIsLoadingPreset] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [verdictSource, setVerdictSource] = useState<{
    sideA: ContenderInput;
    sideB: ContenderInput;
    detail: string;
  } | null>(null);
  const [verdictImages, setVerdictImages] = useState<{ a: string | null; b: string | null }>({
    a: null,
    b: null,
  });
  const [history, setHistory] = useState<ComparisonHistoryItem[]>(readInitialHistory);
  const [revealStep, setRevealStep] = useState<3 | 2 | 1 | null>(null);
  const [revealWinner, setRevealWinner] = useState<"A" | "B" | "TIE" | null>(null);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [activeMatchup, setActiveMatchup] = useState<{
    labelA: string;
    labelB: string;
    imageA: string | null;
    imageB: string | null;
  } | null>(null);

  const pendingRevealRef = useRef<{
    verdict: ComparisonResult;
    source: { sideA: ContenderInput; sideB: ContenderInput; detail: string };
    images: { a: string | null; b: string | null };
    historyItem: ComparisonHistoryItem;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const manualAbortRef = useRef(false);

  useEffect(() => {
    if (!isComparing || revealStep !== null) {
      if (!isComparing) {
        setElapsedSeconds(0);
      }
      return;
    }

    const startedAt = Date.now();
    setElapsedSeconds(0);
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isComparing, revealStep]);

  const commitPendingReveal = () => {
    const pending = pendingRevealRef.current;
    if (!pending) {
      setRevealStep(null);
      setRevealWinner(null);
      setIsComparing(false);
      setActiveMatchup(null);
      return;
    }

    pendingRevealRef.current = null;
    setResult(pending.verdict);
    setVerdictSource(pending.source);
    setVerdictImages(pending.images);
    setHistory((prev) => [pending.historyItem, ...prev]);
    setCelebrateKey((prev) => prev + 1);
    setRevealStep(null);
    setRevealWinner(null);
    setIsComparing(false);
    setActiveMatchup(null);

    setTimeout(() => {
      document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  useEffect(() => {
    if (revealStep === null) return;

    const beatDurationMs = revealStep === 1 ? 1450 : 750;
    const timerId = window.setTimeout(() => {
      if (revealStep === 3) {
        setRevealStep(2);
      } else if (revealStep === 2) {
        setRevealStep(1);
      } else {
        commitPendingReveal();
      }
    }, beatDurationMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [revealStep]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [history]);

  const hasSideA = Boolean(sideA.text.trim() || sideA.imageBase64);
  const hasSideB = Boolean(sideB.text.trim() || sideB.imageBase64);
  const isBusy = isComparing || revealStep !== null;
  const canCompare = hasSideA && hasSideB && !isBusy && !isLoadingPreset;

  const verdictMatchesInputs = Boolean(
    result &&
      !isBusy &&
      verdictSource &&
      sideA.text === verdictSource.sideA.text &&
      sideA.imagePreviewUrl === verdictSource.sideA.imagePreviewUrl &&
      sideB.text === verdictSource.sideB.text &&
      sideB.imagePreviewUrl === verdictSource.sideB.imagePreviewUrl
  );

  const outcomeA: "WIN" | "LOSE" | "TIE" | null = verdictMatchesInputs
    ? result!.winner === "A"
      ? "WIN"
      : result!.winner === "B"
      ? "LOSE"
      : "TIE"
    : null;

  const outcomeB: "WIN" | "LOSE" | "TIE" | null = verdictMatchesInputs
    ? result!.winner === "B"
      ? "WIN"
      : result!.winner === "A"
      ? "LOSE"
      : "TIE"
    : null;

  const handleSwap = () => {
    setSideA(sideB);
    setSideB(sideA);
    setErrorMessage(null);
  };

  const handleCancelComparison = () => {
    pendingRevealRef.current = null;
    setRevealStep(null);
    setRevealWinner(null);
    setActiveMatchup(null);
    if (abortControllerRef.current) {
      manualAbortRef.current = true;
      abortControllerRef.current.abort();
    }
    setIsComparing(false);
  };

  const handleReset = () => {
    if (isBusy) {
      handleCancelComparison();
    }
    setSideA(EMPTY_CONTENDER);
    setSideB(EMPTY_CONTENDER);
    setFocusCriterion("balanced");
    setFocusDetail("");
    setResult(null);
    setCelebrateKey(0);
    setVerdictSource(null);
    setVerdictImages({ a: null, b: null });
    setErrorMessage(null);
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
  };

  const runComparison = async (
    inputA: ContenderInput,
    inputB: ContenderInput,
    focus: FocusCriterion,
    detail: string
  ) => {
    if (!inputA.text.trim() && !inputA.imageBase64) {
      setErrorMessage("후보 A에 사진 또는 주제를 입력해 주세요.");
      return;
    }
    if (!inputB.text.trim() && !inputB.imageBase64) {
      setErrorMessage("후보 B에 사진 또는 주제를 입력해 주세요.");
      return;
    }

    setErrorMessage(null);
    pendingRevealRef.current = null;
    setRevealStep(null);
    setRevealWinner(null);
    setActiveMatchup({
      labelA: inputA.text.trim() || (inputA.imageName ? `사진 (${inputA.imageName})` : "후보 A"),
      labelB: inputB.text.trim() || (inputB.imageName ? `사진 (${inputB.imageName})` : "후보 B"),
      imageA: inputA.imagePreviewUrl,
      imageB: inputB.imagePreviewUrl,
    });
    setIsComparing(true);

    setTimeout(() => {
      document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    manualAbortRef.current = false;
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_SECONDS * 1000
    );

    let enteredReveal = false;

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sideA: {
            text: inputA.text,
            imageBase64: inputA.imageBase64,
            imageMimeType: inputA.imageMimeType,
          },
          sideB: {
            text: inputB.text,
            imageBase64: inputB.imageBase64,
            imageMimeType: inputB.imageMimeType,
          },
          focusCriterion: focus,
          focusDetail: detail,
        }),
      });

      const rawResponseText = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = rawResponseText ? (JSON.parse(rawResponseText) as Record<string, unknown>) : {};
      } catch {
        throw new Error(
          response.status === 413
            ? "업로드한 사진 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요."
            : `서버 응답을 해석하지 못했습니다 (상태 코드: ${response.status}). 잠시 후 다시 시도해 주세요.`
        );
      }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" && data.error
            ? data.error
            : "비교 판정 요청 처리에 실패했습니다."
        );
      }

      const verdict = data as unknown as ComparisonResult;
      const newHistoryItem: ComparisonHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        focusCriterion: focus,
        focusDetail: detail,
        hasPhotoA: Boolean(inputA.imageBase64),
        hasPhotoB: Boolean(inputB.imageBase64),
        inputTextA: inputA.text,
        inputTextB: inputB.text,
        result: verdict,
      };

      pendingRevealRef.current = {
        verdict,
        source: {
          sideA: inputA,
          sideB: inputB,
          detail,
        },
        images: {
          a: inputA.imagePreviewUrl,
          b: inputB.imagePreviewUrl,
        },
        historyItem: newHistoryItem,
      };
      enteredReveal = true;
      setRevealWinner(verdict.winner);
      setRevealStep(3);
    } catch (err) {
      setActiveMatchup(null);
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMessage(
          manualAbortRef.current
            ? "비교 판정 요청을 취소했습니다."
            : "응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
        );
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "판정 요청 중 알 수 없는 오류가 발생했습니다."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      manualAbortRef.current = false;
      if (!enteredReveal) {
        setIsComparing(false);
      }
    }
  };

  const handleLoadPreset = async (preset: PresetMatchup, autoRun: boolean) => {
    setErrorMessage(null);
    setIsLoadingPreset(preset.id);

    try {
      const [imgA, imgB] = await Promise.all([
        preset.sideA.imagePath
          ? urlToProcessedImage(preset.sideA.imagePath, `${preset.id}-a`)
          : Promise.resolve(null),
        preset.sideB.imagePath
          ? urlToProcessedImage(preset.sideB.imagePath, `${preset.id}-b`)
          : Promise.resolve(null),
      ]);

      const nextA: ContenderInput = {
        text: preset.sideA.text,
        imagePreviewUrl: imgA?.previewUrl ?? null,
        imageBase64: imgA?.base64 ?? null,
        imageMimeType: imgA?.mimeType ?? null,
        imageName: imgA?.name ?? null,
      };

      const nextB: ContenderInput = {
        text: preset.sideB.text,
        imagePreviewUrl: imgB?.previewUrl ?? null,
        imageBase64: imgB?.base64 ?? null,
        imageMimeType: imgB?.mimeType ?? null,
        imageName: imgB?.name ?? null,
      };

      setSideA(nextA);
      setSideB(nextB);
      setFocusCriterion(preset.focusCriterion);
      setFocusDetail(preset.focusDetail);

      if (autoRun) {
        setIsLoadingPreset(null);
        await runComparison(nextA, nextB, preset.focusCriterion, preset.focusDetail);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "예시 대결을 불러오지 못했습니다."
      );
    } finally {
      setIsLoadingPreset(null);
    }
  };

  const handleRejudgeWithFocus = (newFocus: FocusCriterion) => {
    if (!verdictSource || isBusy) return;
    setFocusCriterion(newFocus);
    void runComparison(
      verdictSource.sideA,
      verdictSource.sideB,
      newFocus,
      verdictSource.detail
    );
  };

  const handleRestoreHistory = (item: ComparisonHistoryItem) => {
    if (isBusy) {
      handleCancelComparison();
    }
    setCelebrateKey(0);
    setResult(item.result);
    setVerdictImages({ a: null, b: null });
    if (!item.hasPhotoA && !item.hasPhotoB) {
      const restoredA: ContenderInput = {
        ...EMPTY_CONTENDER,
        text: item.inputTextA || item.result.sideALabel,
      };
      const restoredB: ContenderInput = {
        ...EMPTY_CONTENDER,
        text: item.inputTextB || item.result.sideBLabel,
      };
      setSideA(restoredA);
      setSideB(restoredB);
      setVerdictSource({
        sideA: restoredA,
        sideB: restoredB,
        detail: item.focusDetail,
      });
    } else {
      setVerdictSource(null);
    }
    setFocusCriterion(item.focusCriterion);
    setFocusDetail(item.focusDetail);
    setErrorMessage(null);
    document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#13161F] text-[#F1F3F9]">
      {/* 3-Zone Top App Bar */}
      <header className="sticky top-0 z-30 bg-[#13161F]/95 backdrop-blur-md border-b border-[#252B3D]">
        <div className="max-w-[1380px] mx-auto px-5 py-3 flex items-center justify-between gap-8">
          <a
            href="#studio"
            className="font-display text-base font-extrabold tracking-tight text-[#F1F3F9] whitespace-nowrap shrink-0"
          >
            매치 판정소
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#949BB0]">
            <a
              href="#studio"
              className="hover:text-[#F1F3F9] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              비교 스튜디오
            </a>
            <a
              href="#presets"
              className="hover:text-[#F1F3F9] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              예시 대결
            </a>
            <a
              href="#verdict"
              className="hover:text-[#F1F3F9] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              판정 결과
            </a>
            <a
              href="#history"
              className="hover:text-[#F1F3F9] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              최근 기록
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F7CFF] hover:bg-[#6089FF] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              새 비교
            </button>
          </div>
        </div>
      </header>

      {/* Real App Workspace Shell: Left Rail (Presets & History) + Right Main Stage */}
      <div className="flex-1 max-w-[1380px] w-full mx-auto px-5 py-5 grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 items-start">
        {/* Main Comparison Stage (First on mobile, Right column on desktop) */}
        <main className="order-1 lg:order-2 min-w-0 space-y-5">
          {/* Compact Workspace Toolbar + Side-by-Side Comparison Frame */}
          <section
            id="studio"
            className="bg-[#1A1E2B] border border-[#2A3042] rounded-xl overflow-hidden"
          >
            {/* Compact Toolbar Header — No cheesy hero banner */}
            <div className="px-5 py-3.5 border-b border-[#252B3D] bg-[#161A26] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-sm font-bold text-[#F1F3F9] whitespace-nowrap">
                  새 비교 판정
                </h1>
                <span className="text-[#3A4158]" aria-hidden="true">
                  ·
                </span>
                <p className="text-xs text-[#949BB0] truncate">
                  사진 2장, 주제 2개, 또는 혼합 입력으로 우위 비율을 계산합니다
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#12151F] border border-[#262C3F] rounded-lg self-start xl:self-auto">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isBusy}
                    title={opt.description}
                    onClick={() => setFocusCriterion(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      focusCriterion === opt.id
                        ? "bg-[#4F7CFF] text-white"
                        : "text-[#949BB0] hover:text-[#F1F3F9]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Side A vs Side B Split */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
              <ContenderCard
                side="A"
                value={sideA}
                onChange={setSideA}
                onError={setErrorMessage}
                disabled={isBusy || Boolean(isLoadingPreset)}
                outcome={outcomeA}
              />

              {/* Center Swap Divider */}
              <div className="flex md:flex-col items-center justify-center border-y md:border-y-0 md:border-x border-[#252B3D] bg-[#161A26] px-3 py-2 md:py-5 gap-3">
                <span className="hidden md:block flex-1 w-px bg-[#252B3D]" aria-hidden="true" />
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={isBusy || Boolean(isLoadingPreset)}
                  title="후보 A와 후보 B 위치 바꾸기"
                  aria-label="후보 A와 후보 B 위치 바꾸기"
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#222738] border border-[#303850] text-xs font-semibold text-[#C8CFDF] hover:text-white hover:border-[#4A5578] transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="md:hidden">좌우 교체</span>
                </button>
                <span className="hidden md:block flex-1 w-px bg-[#252B3D]" aria-hidden="true" />
              </div>

              <ContenderCard
                side="B"
                value={sideB}
                onChange={setSideB}
                onError={setErrorMessage}
                disabled={isBusy || Boolean(isLoadingPreset)}
                outcome={outcomeB}
              />
            </div>

            {/* Unified Bottom Action Bar */}
            <div className="border-t border-[#252B3D] bg-[#161A26] px-5 py-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="focus-detail-input" className="sr-only">
                    세부 평가 조건 입력
                  </label>
                  <input
                    id="focus-detail-input"
                    type="text"
                    disabled={isBusy}
                    value={focusDetail}
                    onChange={(e) => setFocusDetail(e.target.value)}
                    placeholder="추가 조건이 있다면 입력하세요 (예: 자취생 예산 기준, 30대 직장인 데일리룩)"
                    className="w-full rounded-lg border border-[#2C3347] bg-[#12151F] px-3.5 py-2 text-sm text-[#F1F3F9] placeholder:text-[#5B637A] focus:outline-none focus:border-[#4F8BFF]/80 transition-colors"
                  />
                </div>

                <button
                  type="button"
                  disabled={!canCompare}
                  onClick={() => void runComparison(sideA, sideB, focusCriterion, focusDetail)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#4F7CFF] hover:bg-[#6089FF] rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:bg-[#252B3D] disabled:text-[#687089] disabled:cursor-not-allowed"
                >
                  {revealStep !== null ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span className="tabular-nums">결과 공개 · {revealStep}초</span>
                    </>
                  ) : isComparing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span className="tabular-nums">
                        {elapsedSeconds >= COUNTDOWN_DISPLAY_SECONDS
                          ? "마무리 중..."
                          : `비율 판정 중 · ${Math.max(1, COUNTDOWN_DISPLAY_SECONDS - elapsedSeconds)}초`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-4 h-4" aria-hidden="true" />
                      비율 판정하기
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-xs md:text-sm text-rose-300 flex items-center justify-between gap-3"
                >
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-xs font-semibold text-rose-300 hover:underline whitespace-nowrap shrink-0"
                  >
                    닫기
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Verdict Stage */}
          <VerdictStage
            result={result}
            isLoading={isBusy}
            elapsedSeconds={elapsedSeconds}
            maxWaitSeconds={COUNTDOWN_DISPLAY_SECONDS}
            revealStep={revealStep}
            revealWinner={revealWinner}
            celebrateKey={celebrateKey}
            activeMatchup={activeMatchup}
            onCancel={handleCancelComparison}
            onSkipReveal={commitPendingReveal}
            canRejudge={Boolean(verdictSource) && !isLoadingPreset}
            activeFocus={focusCriterion}
            onRejudgeWithFocus={handleRejudgeWithFocus}
            previewImageA={verdictImages.a}
            previewImageB={verdictImages.b}
          />
        </main>

        {/* Left App Utility Sidebar: Quick Presets + History Ledger */}
        <aside className="order-2 lg:order-1 space-y-5 lg:sticky lg:top-[68px]">
          {/* Presets List */}
          <section
            id="presets"
            className="bg-[#1A1E2B] border border-[#2A3042] rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#949BB0]">예시 대결</h2>
              <span className="text-[11px] text-[#687089]">원클릭 실행</span>
            </div>

            <div className="space-y-2">
              {PRESET_MATCHUPS.map((preset) => {
                const busy = isLoadingPreset === preset.id;
                return (
                  <div
                    key={preset.id}
                    className="rounded-lg border border-[#262C3F] bg-[#141824] hover:border-[#3A435E] transition-colors p-3 space-y-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      {preset.sideA.imagePath && preset.sideB.imagePath && (
                        <div className="grid grid-cols-2 gap-1 w-14 shrink-0 rounded overflow-hidden bg-[#0F121B] p-0.5 border border-[#262C3F]">
                          <img
                            src={preset.sideA.imagePath}
                            alt="예시 A"
                            referrerPolicy="no-referrer"
                            className="aspect-square w-full object-cover rounded-[2px]"
                          />
                          <img
                            src={preset.sideB.imagePath}
                            alt="예시 B"
                            referrerPolicy="no-referrer"
                            className="aspect-square w-full object-cover rounded-[2px]"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-[11px] font-medium text-[#7A8299] truncate">
                          {preset.category}
                        </div>
                        <h3 className="text-xs font-bold text-[#E2E6F0] leading-snug">
                          {preset.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy || Boolean(isLoadingPreset)}
                        onClick={() => void handleLoadPreset(preset, true)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#2B3554] hover:bg-[#3A4870] rounded-md transition-colors whitespace-nowrap disabled:opacity-40"
                      >
                        <Play className="w-3 h-3" aria-hidden="true" />
                        {busy ? "불러오는 중..." : "바로 판정"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || Boolean(isLoadingPreset)}
                        onClick={() => void handleLoadPreset(preset, false)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-[#B8C0D4] bg-[#1F2536] hover:bg-[#283046] rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
                      >
                        채우기
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* History Ledger */}
          <div className="bg-[#1A1E2B] border border-[#2A3042] rounded-xl p-4">
            <HistorySection
              compact
              items={history}
              onSelect={handleRestoreHistory}
              onDelete={(id) => setHistory((prev) => prev.filter((item) => item.id !== id))}
              onClearAll={() => setHistory([])}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
