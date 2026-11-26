export interface ContenderInput {
  label: string;
  imageDataUrl: string | null;
  imageBase64: string | null;
  mimeType: string | null;
}

export interface CriterionBreakdown {
  criterion: string;
  scoreA: number;
  scoreB: number;
  insight: string;
}

export interface SourceLink {
  title: string;
  uri: string;
}

export interface ComparisonResult {
  title: string;
  contenderAName: string;
  contenderBName: string;
  ratioA: number;
  ratioB: number;
  winner: 'A' | 'B' | 'TIE';
  verdictHeadline: string;
  decidingReason: string;
  finisherMove: string;
  criteriaBreakdown: CriterionBreakdown[];
  strengthsA: string[];
  strengthsB: string[];
  sources: SourceLink[];
}

export interface MatchHistoryEntry {
  id: string;
  createdAt: string;
  focusCriteria: string;
  contenderAImage: string | null;
  contenderBImage: string | null;
  result: ComparisonResult;
}

export interface MatchPreset {
  id: string;
  category: string;
  labelA: string;
  labelB: string;
  focusCriteria: string;
}
