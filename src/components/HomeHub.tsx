import { ArrowRight, Camera, Clock, Layers, MessageSquareText, Play, Scale } from "lucide-react";
import { FOCUS_OPTIONS } from "../data/presets";
import { ComparisonHistoryItem, FocusCriterion, PresetMatchup } from "../types/comparison";

export type LaunchMode = "photo" | "topic" | "hybrid";

interface HomeHubProps {
  presets: PresetMatchup[];
  history: ComparisonHistoryItem[];
  isLoadingPreset: string | null;
  onStartMode: (mode: LaunchMode, defaultFocus?: FocusCriterion) => void;
  onSelectPreset: (preset: PresetMatchup, autoRun: boolean) => void;
  onSelectHistory: (item: ComparisonHistoryItem) => void;
  onEnterStudio: () => void;
}

export function HomeHub({
  presets,
  history,
  isLoadingPreset,
  onStartMode,
  onSelectPreset,
  onSelectHistory,
  onEnterStudio,
}: HomeHubProps) {
  const recentItems = history.slice(0, 3);

  return (
    <div className="animate-result-reveal flex-1 max-w-[1160px] w-full mx-auto px-5 py-8 md:py-12 space-y-8">
      {/* Compact Software App Header Row — Clean & Functional */}
      <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#252B3D] pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6BA4FF]">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>매치 판정소 워크스페이스</span>
          </div>
          <h1 className="font-display text-2xl md:text-[28px] font-bold tracking-tight text-[#F1F3F9]">
            무엇을 비교할까요?
          </h1>
          <p className="text-sm text-[#949BB0]">
            비교 방식을 선택하거나 추천 대결을 바로 시작하세요.
          </p>
        </div>

        <button
          type="button"
          onClick={onEnterStudio}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#4F7CFF] hover:bg-[#6089FF] rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          비교 스튜디오 열기
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </section>

      {/* 3 Primary Mode Launcher Cards */}
      <section aria-label="비교 모드 선택" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onStartMode("photo", "aesthetic")}
          className="group text-left bg-[#1A1E2B] hover:bg-[#1E2333] border border-[#2A3042] hover:border-[#4F8BFF]/70 rounded-xl p-5 flex flex-col justify-between gap-5 transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#4F8BFF]/15 border border-[#4F8BFF]/35 flex items-center justify-center text-[#6BA4FF]">
                <Camera className="w-5 h-5" aria-hidden="true" />
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#5B637A] group-hover:text-[#6BA4FF] group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#F1F3F9]">사진 대 사진 비교</h2>
              <p className="text-xs text-[#949BB0] leading-relaxed">
                두 장의 이미지를 올려 시각적 완성도, 구도, 분위기 우위 비율을 판정합니다.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-[#6BA4FF]">
            디자인 · 심미성 기준 자동 선택
          </div>
        </button>

        <button
          type="button"
          onClick={() => onStartMode("topic", "balanced")}
          className="group text-left bg-[#1A1E2B] hover:bg-[#1E2333] border border-[#2A3042] hover:border-[#FF6B57]/70 rounded-xl p-5 flex flex-col justify-between gap-5 transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B57]/15 border border-[#FF6B57]/35 flex items-center justify-center text-[#FF8A75]">
                <MessageSquareText className="w-5 h-5" aria-hidden="true" />
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#5B637A] group-hover:text-[#FF8A75] group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#F1F3F9]">주제 · 제품 대결</h2>
              <p className="text-xs text-[#949BB0] leading-relaxed">
                스마트폰, 노트북, 여행지 등 고민되는 두 선택지를 검색 근거로 비교합니다.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-[#FF8A75]">
            웹 검색 기반 사실 검증 적용
          </div>
        </button>

        <button
          type="button"
          onClick={() => onStartMode("hybrid", "value")}
          className="group text-left bg-[#1A1E2B] hover:bg-[#1E2333] border border-[#2A3042] hover:border-[#4F7CFF]/70 rounded-xl p-5 flex flex-col justify-between gap-5 transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#4F7CFF]/15 border border-[#4F7CFF]/35 flex items-center justify-center text-[#8FA8FF]">
                <Layers className="w-5 h-5" aria-hidden="true" />
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#5B637A] group-hover:text-[#8FA8FF] group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#F1F3F9]">사진 + 조건 혼합 비교</h2>
              <p className="text-xs text-[#949BB0] leading-relaxed">
                사진과 가격·상황 조건을 함께 입력해 맞춤형 비율과 선택 가이드를 받습니다.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-[#8FA8FF]">
            가성비 · 실용성 조건 맞춤 판정
          </div>
        </button>
      </section>

      {/* Bottom Workspace Grid: Quick Matchups + Recent Verdicts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5 items-start">
        {/* Curated Quick Matchups */}
        <section className="bg-[#1A1E2B] border border-[#2A3042] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#F1F3F9]">추천 대결 바로 시작</h2>
            <span className="text-xs text-[#7A8299]">클릭 시 즉시 판정 실행</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {presets.map((preset) => {
              const busy = isLoadingPreset === preset.id;
              return (
                <div
                  key={preset.id}
                  className="rounded-lg border border-[#262C3F] bg-[#141824] hover:border-[#3A435E] transition-colors p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {preset.sideA.imagePath && preset.sideB.imagePath && (
                      <div className="grid grid-cols-2 gap-1 w-16 shrink-0 rounded overflow-hidden bg-[#0F121B] p-0.5 border border-[#262C3F]">
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
                    <div className="min-w-0 space-y-1">
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
                      disabled={Boolean(isLoadingPreset)}
                      onClick={() => onSelectPreset(preset, true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#2B3554] hover:bg-[#3A4870] rounded-md transition-colors whitespace-nowrap disabled:opacity-40"
                    >
                      <Play className="w-3 h-3" aria-hidden="true" />
                      {busy ? "불러오는 중..." : "바로 판정"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(isLoadingPreset)}
                      onClick={() => onSelectPreset(preset, false)}
                      className="px-2.5 py-1.5 text-xs font-medium text-[#B8C0D4] bg-[#1F2536] hover:bg-[#283046] rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
                    >
                      편집하기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent History Preview */}
        <section className="bg-[#1A1E2B] border border-[#2A3042] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7A8299]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#F1F3F9]">최근 판정 기록</h2>
            </div>
            <span className="font-mono text-xs text-[#7A8299] tabular-nums">
              총 {history.length}건
            </span>
          </div>

          {recentItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#272D40] bg-[#141824] px-4 py-8 text-center space-y-2">
              <p className="text-xs font-medium text-[#949BB0]">
                아직 진행된 판정 기록이 없습니다.
              </p>
              <p className="text-[11px] text-[#687089]">
                비교를 실행하면 비율 결과와 분석 근거가 자동으로 저장됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentItems.map((item) => {
                const focusLabel =
                  FOCUS_OPTIONS.find((f) => f.id === item.focusCriterion)?.label ?? "종합";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectHistory(item)}
                    className="w-full text-left rounded-lg border border-[#262C3F] bg-[#141824] hover:border-[#3A435E] hover:bg-[#191E2D] transition-colors p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#E2E6F0] truncate">
                        {item.result.sideALabel} vs {item.result.sideBLabel}
                      </span>
                      <span className="font-mono tabular-nums text-xs font-bold shrink-0">
                        <span className="text-[#6BA4FF]">{item.result.ratioA}</span>
                        <span className="text-[#4B5470] mx-1">:</span>
                        <span className="text-[#FF8A75]">{item.result.ratioB}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#7A8299]">
                      <span className="truncate">{item.result.headlineVerdict}</span>
                      <span className="shrink-0">{focusLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
