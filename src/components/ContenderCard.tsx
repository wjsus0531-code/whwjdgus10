import React, {useRef, useState} from 'react';
import {ImagePlus, Upload, X} from 'lucide-react';
import type {ContenderInput} from '../types/comparison';
import {processImageFile} from '../utils/image';

interface ContenderCardProps {
  side: 'A' | 'B';
  value: ContenderInput;
  onChange: (next: ContenderInput) => void;
  disabled?: boolean;
}

export const ContenderCard: React.FC<ContenderCardProps> = ({
  side,
  value,
  onChange,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isA = side === 'A';
  const accentText = isA ? 'text-[#4F8BFF]' : 'text-[#FF5E57]';
  const accentBorder = isA ? 'border-[#4F8BFF]/40' : 'border-[#FF5E57]/40';
  const accentFocus = isA
    ? 'focus:border-[#4F8BFF] focus:ring-[#4F8BFF]/25'
    : 'focus:border-[#FF5E57] focus:ring-[#FF5E57]/25';

  const handleFiles = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    try {
      const processed = await processImageFile(file);
      onChange({
        ...value,
        imageDataUrl: processed.dataUrl,
        imageBase64: processed.base64,
        mimeType: processed.mimeType,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    void handleFiles(file);
  };

  const clearImage = () => {
    onChange({
      ...value,
      imageDataUrl: null,
      imageBase64: null,
      mimeType: null,
    });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setUploadError(null);
  };

  return (
    <section
      aria-label={`후보 ${side} 입력`}
      className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#1B1F2B] p-6 transition-colors"
    >
      <div>
        <div className="mb-4 flex items-baseline justify-between border-b border-white/8 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-[#F1F3F9]">
            <span className={`font-mono-tabular mr-2 ${accentText}`}>{side}.</span>
            {isA ? '첫 번째 후보' : '두 번째 후보'}
          </h2>
          <span className="text-xs text-[#94A3B8]">텍스트 또는 사진</span>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#CBD5E1]">후보 이름 / 주제</span>
          <input
            type="text"
            value={value.label}
            disabled={disabled}
            onChange={(e) => onChange({...value, label: e.target.value})}
            placeholder={isA ? '예: 아이폰 16 프로' : '예: 갤럭시 S25 울트라'}
            className={`w-full rounded-xl border border-white/12 bg-[#13161F] px-4 py-3 text-base text-[#F1F3F9] placeholder-[#64748B] outline-none ring-2 ring-transparent transition-all disabled:opacity-60 ${accentFocus}`}
          />
        </label>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[#CBD5E1]">비교 사진 첨부 (선택)</span>
            {value.imageDataUrl && (
              <button
                type="button"
                onClick={clearImage}
                disabled={disabled}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#94A3B8] transition-colors hover:text-white disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                사진 지우기
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(e) => void handleFiles(e.target.files?.[0])}
            className="sr-only"
          />

          {value.imageDataUrl ? (
            <div className={`relative overflow-hidden rounded-xl border bg-[#13161F] ${accentBorder}`}>
              <img
                src={value.imageDataUrl}
                alt={value.label ? `${value.label} 미리보기` : `후보 ${side} 사진`}
                className="h-52 w-full object-cover"
              />
              <div className="flex items-center justify-between border-t border-white/10 bg-[#13161F]/90 px-4 py-2.5">
                <span className="truncate text-xs text-[#CBD5E1]">
                  대결 시 스틱맨 머리에 적용됩니다
                </span>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled}
                  className="shrink-0 text-xs font-semibold text-[#F1F3F9] underline-offset-4 hover:underline disabled:opacity-50"
                >
                  사진 교체
                </button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-colors ${
                isDragging
                  ? `${accentBorder} bg-white/5`
                  : 'border-white/15 bg-[#13161F]/70 hover:border-white/30 hover:bg-[#13161F]'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-[#CBD5E1]">
                {isDragging ? <Upload className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
              </div>
              <p className="text-sm font-medium text-[#E2E8F0]">
                사진을 끌어다 놓거나 클릭해 업로드
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">
                JPG, PNG, WEBP 지원 · 사진만으로도 비교 가능
              </p>
            </div>
          )}

          {uploadError && (
            <p className="mt-2 text-xs font-medium text-[#FF7B75]" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
