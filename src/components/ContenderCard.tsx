import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, RefreshCw, Scale, Trophy, X } from "lucide-react";
import { ContenderInput } from "../types/comparison";
import { fileToProcessedImage } from "../utils/image";

interface ContenderCardProps {
  side: "A" | "B";
  value: ContenderInput;
  onChange: (next: ContenderInput) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  outcome?: "WIN" | "LOSE" | "TIE" | null;
}

export function ContenderCard({
  side,
  value,
  onChange,
  onError,
  disabled = false,
  outcome = null,
}: ContenderCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  useEffect(() => {
    setImgLoadFailed(false);
  }, [value.imagePreviewUrl]);

  const isSideA = side === "A";
  const sideTitle = isSideA ? "후보 A" : "후보 B";
  const isWin = outcome === "WIN";
  const isLose = outcome === "LOSE";
  const isTie = outcome === "TIE";

  const accentText = isLose
    ? "text-[#8B91A1]"
    : isSideA
    ? "text-[#6BA4FF]"
    : "text-[#FF8A75]";
  const indicatorDot = isLose
    ? "bg-[#6B7280]"
    : isSideA
    ? "bg-[#4F8BFF]"
    : "bg-[#FF6B57]";
  const focusBorder = isSideA
    ? "focus:border-[#4F8BFF]/80 focus:ring-[#4F8BFF]/20"
    : "focus:border-[#FF6B57]/80 focus:ring-[#FF6B57]/20";
  const dragStyles = isSideA
    ? "border-[#4F8BFF]/80 bg-[#4F8BFF]/[0.08]"
    : "border-[#FF6B57]/80 bg-[#FF6B57]/[0.08]";

  const cardSurfaceClass = isWin
    ? isSideA
      ? "bg-[#1C2338] ring-1 ring-inset ring-[#4F8BFF]/80 shadow-[inset_0_1px_0_rgba(107,164,255,0.28),0_0_26px_rgba(79,139,255,0.14)]"
      : "bg-[#261D26] ring-1 ring-inset ring-[#FF6B57]/80 shadow-[inset_0_1px_0_rgba(255,138,117,0.28),0_0_26px_rgba(255,107,87,0.14)]"
    : isLose
    ? "bg-[#14161D]"
    : isTie
    ? "bg-[#1D2231] ring-1 ring-inset ring-[#5D6B8E]/55"
    : "bg-[#1A1E2B]";

  const handleFile = async (file: File) => {
    try {
      const processed = await fileToProcessedImage(file);
      setImgLoadFailed(false);
      onChange({
        ...value,
        imagePreviewUrl: processed.previewUrl,
        imageBase64: processed.base64,
        imageMimeType: processed.mimeType,
        imageName: processed.name,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "사진을 처리하는 중 오류가 발생했습니다.");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        void handleFile(file);
      }
    }
  };

  const removeImage = () => {
    setImgLoadFailed(false);
    onChange({
      ...value,
      imagePreviewUrl: null,
      imageBase64: null,
      imageMimeType: null,
      imageName: null,
    });
  };

  const hasImage = Boolean(value.imagePreviewUrl);
  const inputStatus =
    isWin
      ? "우승"
      : isLose
      ? "패배"
      : isTie
      ? "동률"
      : hasImage && value.text.trim()
      ? "사진 + 설명"
      : hasImage
      ? "사진 첨부됨"
      : value.text.trim()
      ? "주제 입력됨"
      : "대기 중";

  return (
    <div
      onPaste={handlePaste}
      className={`p-5 flex flex-col gap-4 transition-all duration-500 ${cardSurfaceClass}`}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block w-2 h-2 rounded-xs shrink-0 ${indicatorDot}`}
            aria-hidden="true"
          />
          <h2
            className={`text-sm font-bold tracking-tight whitespace-nowrap ${
              isLose ? "text-[#9CA3B5]" : "text-[#F1F3F9]"
            }`}
          >
            {sideTitle}
          </h2>
          <span className="text-[#3A4158]" aria-hidden="true">
            ·
          </span>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold truncate ${
              isWin
                ? isSideA
                  ? "text-[#78B0FF]"
                  : "text-[#FF8A75]"
                : isLose
                ? "text-[#7D8394]"
                : isTie
                ? "text-[#B8C4E0]"
                : hasImage || value.text.trim()
                ? accentText
                : "text-[#7A8299]"
            }`}
          >
            {isWin && <Trophy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            {isTie && <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            {inputStatus}
          </span>
        </div>

        {hasImage && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#B8C0D4] hover:text-white hover:bg-[#252B3D] rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              교체
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={removeImage}
              aria-label={`${sideTitle} 사진 삭제`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#8E96AD] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              <X className="w-3 h-3" aria-hidden="true" />
              삭제
            </button>
          </div>
        )}
      </div>

      {/* Photo Dropzone / Preview (16:10 compact workspace ratio) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {hasImage && value.imagePreviewUrl ? (
        <div
          className={`relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#12151F] border transition-all duration-500 ${
            isWin
              ? isSideA
                ? "border-[#4F8BFF]/80 ring-2 ring-[#4F8BFF]/25"
                : "border-[#FF6B57]/80 ring-2 ring-[#FF6B57]/25"
              : isLose
              ? "border-[#252834] grayscale contrast-90 brightness-75 opacity-60"
              : isTie
              ? "border-[#5D6B8E]/75"
              : "border-[#2C3347]"
          }`}
        >
          {!imgLoadFailed ? (
            <img
              src={value.imagePreviewUrl}
              alt={`${sideTitle} 비교 대상 이미지`}
              referrerPolicy="no-referrer"
              onError={() => setImgLoadFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-[#12151F] text-[#7A8299] p-4 text-center">
              <ImagePlus className="w-6 h-6 text-[#57607A]" aria-hidden="true" />
              <span className="text-xs font-medium">
                {value.imageName || `${sideTitle} 이미지`}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0D1017]/90 via-[#0D1017]/50 to-transparent px-3.5 py-2.5 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#F1F3F9] truncate">
              {value.imageName || "첨부 이미지"}
            </span>
            <span className="text-[11px] font-mono text-[#B8C0D4] shrink-0">
              {isWin ? "WINNER" : isLose ? "DEFEAT" : isTie ? "DRAW" : "준비됨"}
            </span>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${sideTitle} 사진 업로드 영역`}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`aspect-[16/10] w-full rounded-lg border border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-2.5 px-5 text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8BFF] ${
            isDragging
              ? dragStyles
              : isLose
              ? "border-[#262934] bg-[#12141B] opacity-50 grayscale"
              : "border-[#2F364B] bg-[#141824] hover:bg-[#161B28] hover:border-[#46506E]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="w-9 h-9 rounded-lg bg-[#1F2536] border border-[#2F364B] flex items-center justify-center text-[#B8C0D4]">
            <ImagePlus className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#E2E6F0]">
              사진 드래그 · 클릭 · Ctrl+V 붙여넣기
            </p>
            <p className="text-[11px] text-[#7A8299]">
              사진 없이 아래에 주제만 입력해도 비교할 수 있습니다
            </p>
          </div>
        </div>
      )}

      {/* Text / Topic Input */}
      <div className={`flex flex-col gap-1.5 transition-opacity duration-500 ${isLose ? "opacity-60 grayscale" : ""}`}>
        <div className="flex items-center justify-between">
          <label
            htmlFor={`contender-text-${side}`}
            className="text-xs font-medium text-[#949BB0]"
          >
            주제 또는 설명
          </label>
          <span className="font-mono text-[11px] text-[#687089] tabular-nums">
            {value.text.length}자
          </span>
        </div>
        <textarea
          id={`contender-text-${side}`}
          rows={2}
          disabled={disabled}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={
            isSideA
              ? "비교할 대상이나 질문 (예: 아이폰 16 프로)"
              : "비교할 대상이나 질문 (예: 갤럭시 S25 울트라)"
          }
          className={`w-full rounded-lg border bg-[#12151F] px-3 py-2 text-sm text-[#F1F3F9] placeholder:text-[#5B637A] focus:outline-none focus:ring-2 transition-colors resize-none ${
            isWin
              ? isSideA
                ? "border-[#4F8BFF]/60"
                : "border-[#FF6B57]/60"
              : "border-[#2C3347]"
          } ${focusBorder} disabled:opacity-50`}
        />
      </div>
    </div>
  );
}
