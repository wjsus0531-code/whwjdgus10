export type FocusCriterion =
  | "balanced"
  | "value"
  | "aesthetic"
  | "performance"
  | "experience";

export interface ContenderInput {
  text: string;
  imagePreviewUrl: string | null;
  imageBase64: string | null;
  imageMimeType: string | null;
  imageName: string | null;
}

export interface CriterionScore {
  criterion: string;
  scoreA: number;
  scoreB: number;
  edge: "A" | "B" | "TIE";
  reason: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ComparisonResult {
  winner: "A" | "B" | "TIE";
  winnerName: string;
  sideALabel: string;
  sideBLabel: string;
  ratioA: number;
  ratioB: number;
  headlineVerdict: string;
  summaryReason: string;
  decidingFactor: string;
  verificationNote: string;
  criteriaBreakdown: CriterionScore[];
  sideAStrengths: string[];
  sideBStrengths: string[];
  recommendation: string;
  sources?: GroundingSource[];
}

export interface ComparisonHistoryItem {
  id: string;
  createdAt: string;
  focusCriterion: FocusCriterion;
  focusDetail: string;
  hasPhotoA: boolean;
  hasPhotoB: boolean;
  inputTextA: string;
  inputTextB: string;
  result: ComparisonResult;
}

export interface PresetMatchup {
  id: string;
  category: string;
  title: string;
  description: string;
  focusCriterion: FocusCriterion;
  focusDetail: string;
  sideA: {
    text: string;
    imagePath?: string;
  };
  sideB: {
    text: string;
    imagePath?: string;
  };
}
