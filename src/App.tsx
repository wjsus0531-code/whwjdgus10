import React, {useEffect, useState} from 'react';
import {HomeHub} from './components/HomeHub';
import {StickmanDuelArena} from './components/StickmanDuelArena';
import {VerdictStage} from './components/VerdictStage';
import type {
  ComparisonResult,
  ContenderInput,
  MatchHistoryEntry,
  MatchPreset,
} from './types/comparison';

type AppStage = 'setup' | 'duel' | 'verdict';

const HISTORY_STORAGE_KEY = 'match_verdict_history_v1';

const emptyContender = (): ContenderInput => ({
  label: '',
  imageDataUrl: null,
  imageBase64: null,
  mimeType: null,
});

function loadHistory(): MatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function App() {
  const [stage, setStage] = useState<AppStage>('setup');
  const [contenderA, setContenderA] = useState<ContenderInput>(emptyContender);
  const [contenderB, setContenderB] = useState<ContenderInput>(emptyContender);
  const [focusCriteria, setFocusCriteria] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<ComparisonResult | null>(null);
  const [activeImageA, setActiveImageA] = useState<string | null>(null);
  const [activeImageB, setActiveImageB] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [history, setHistory] = useState<MatchHistoryEntry[]>(loadHistory);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [history]);

  const handleApplyPreset = (preset: MatchPreset) => {
    setErrorMessage(null);
    setContenderA((prev) => ({...prev, label: preset.labelA}));
    setContenderB((prev) => ({...prev, label: preset.labelB}));
    setFocusCriteria(preset.focusCriteria);
  };

  const handleResetInputs = () => {
    setContenderA(emptyContender());
    setContenderB(emptyContender());
    setFocusCriteria('');
    setErrorMessage(null);
  };

  const handleNewMatch = () => {
    setShowCelebration(false);
    setStage('setup');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const hasA = Boolean(contenderA.label.trim() || contenderA.imageBase64);
    const hasB = Boolean(contenderB.label.trim() || contenderB.imageBase64);

    if (!hasA || !hasB) {
      setErrorMessage('후보 A와 후보 B 모두 이름 또는 사진을 입력해 주세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contenderA: {
            label: contenderA.label.trim(),
            imageBase64: contenderA.imageBase64,
            mimeType: contenderA.mimeType,
          },
          contenderB: {
            label: contenderB.label.trim(),
            imageBase64: contenderB.imageBase64,
            mimeType: contenderB.mimeType,
          },
          focusCriteria: focusCriteria.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : '비교 판정을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
      }

      const result = data as ComparisonResult;
      const imgA = contenderA.imageDataUrl;
      const imgB = contenderB.imageDataUrl;

      setActiveResult(result);
      setActiveImageA(imgA);
      setActiveImageB(imgB);
      setShowCelebration(false);
      setStage('duel');
      window.scrollTo({top: 0, behavior: 'smooth'});

      const newEntry: MatchHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        focusCriteria: focusCriteria.trim(),
        contenderAImage: imgA,
        contenderBImage: imgB,
        result,
      };
      setHistory((prev) => [newEntry, ...prev].slice(0, 12));
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : '판정 요청 중 예기치 않은 오류가 발생했습니다.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDuelComplete = () => {
    setStage('verdict');
    setShowCelebration(true);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleSelectHistory = (entry: MatchHistoryEntry) => {
    setActiveResult(entry.result);
    setActiveImageA(entry.contenderAImage);
    setActiveImageB(entry.contenderBImage);
    setShowCelebration(false);
    setStage('verdict');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#13161F] text-[#F1F3F9]">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#13161F]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-8 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleNewMatch}
            className="font-display shrink-0 whitespace-nowrap text-lg font-extrabold tracking-tight text-[#F1F3F9]"
          >
            매치 판정소
          </button>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#94A3B8] md:flex">
            <button
              type="button"
              onClick={handleNewMatch}
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              비교 입력
            </button>
            <a
              href="#guide-section"
              onClick={() => {
                if (stage !== 'setup') setStage('setup');
              }}
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              판정 방식
            </a>
            <a
              href="#history-section"
              onClick={() => {
                if (stage !== 'setup') setStage('setup');
              }}
              className="shrink-0 whitespace-nowrap transition-colors hover:text-white"
            >
              최근 기록
            </a>
          </nav>

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={handleNewMatch}
              className="shrink-0 whitespace-nowrap rounded-lg bg-white/8 px-4 py-2 text-xs font-semibold text-[#F1F3F9] transition-colors hover:bg-white/15"
            >
              새 매치
            </button>
          </div>
        </div>
      </header>

      {stage === 'setup' && (
        <HomeHub
          contenderA={contenderA}
          contenderB={contenderB}
          focusCriteria={focusCriteria}
          isAnalyzing={isAnalyzing}
          errorMessage={errorMessage}
          history={history}
          onChangeA={setContenderA}
          onChangeB={setContenderB}
          onChangeCriteria={setFocusCriteria}
          onApplyPreset={handleApplyPreset}
          onSubmit={handleSubmit}
          onResetInputs={handleResetInputs}
          onSelectHistory={handleSelectHistory}
          onDeleteHistory={handleDeleteHistory}
          onClearHistory={handleClearHistory}
        />
      )}

      {stage === 'duel' && activeResult && (
        <StickmanDuelArena
          result={activeResult}
          imageA={activeImageA}
          imageB={activeImageB}
          onComplete={handleDuelComplete}
        />
      )}

      {stage === 'verdict' && activeResult && (
        <VerdictStage
          result={activeResult}
          imageA={activeImageA}
          imageB={activeImageB}
          showCelebration={showCelebration}
          onReplayDuel={() => {
            setShowCelebration(false);
            setStage('duel');
            window.scrollTo({top: 0, behavior: 'smooth'});
          }}
          onNewMatch={handleNewMatch}
        />
      )}
    </div>
  );
}

export default App;
