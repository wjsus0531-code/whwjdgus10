import crypto from "crypto";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type, type GenerateContentResponse, type Part } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ContenderPayload {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

interface CompareRequestBody {
  sideA?: ContenderPayload;
  sideB?: ContenderPayload;
  focusCriterion?: string;
  focusDetail?: string;
}

interface CriterionScore {
  criterion: string;
  scoreA: number;
  scoreB: number;
  edge: "A" | "B" | "TIE";
  reason: string;
}

interface GroundingSource {
  title: string;
  uri: string;
}

interface ComparisonResponse {
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

const FOCUS_LABELS: Record<string, string> = {
  balanced: "종합 밸런스 (실용성, 완성도, 매력도, 효율성을 균형 있게 평가)",
  value: "가성비 및 실용성 (비용 대비 효용, 유지 관리, 일상 활용도 중심)",
  aesthetic: "디자인 및 심미성 (시각적 조화, 디테일, 구도, 분위기 중심)",
  performance: "성능 및 효율성 (기능적 우위, 생산성, 결과물 품질 중심)",
  experience: "감성 및 만족도 (경험의 깊이, 취향 저격, 기억에 남는 매력 중심)",
};

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const MAX_CACHE_ENTRIES = 100;
const comparisonCache = new Map<string, ComparisonResponse>();

function buildCacheKey(payload: {
  textA: string;
  textB: string;
  imageA: string;
  imageB: string;
  focusKey: string;
  focusDetail: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        payload.textA,
        payload.textB,
        payload.imageA,
        payload.imageB,
        payload.focusKey,
        payload.focusDetail,
      ])
    )
    .digest("hex");
}

function setCachedComparison(key: string, value: ComparisonResponse): void {
  if (comparisonCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = comparisonCache.keys().next().value;
    if (oldestKey) {
      comparisonCache.delete(oldestKey);
    }
  }
  comparisonCache.set(key, value);
}

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429");
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("UPSTREAM_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isTransient =
        error instanceof SyntaxError ||
        msg.includes("EMPTY_MODEL_RESPONSE") ||
        msg.includes("UPSTREAM_TIMEOUT") ||
        msg.includes("503") ||
        msg.includes("500") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("DEADLINE_EXCEEDED") ||
        msg.includes("fetch failed") ||
        isRateLimitError(error);
      if (!isTransient || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = isRateLimitError(error) ? 500 : 400 * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function normalizeResult(raw: ComparisonResponse): ComparisonResponse {
  const parsedRatioA = Number(raw.ratioA);
  const clampedA = Math.max(
    0,
    Math.min(100, Number.isFinite(parsedRatioA) ? Math.round(parsedRatioA) : 50)
  );
  const ratioB = 100 - clampedA;
  const winner: "A" | "B" | "TIE" =
    clampedA > ratioB ? "A" : ratioB > clampedA ? "B" : "TIE";

  const sideALabel = (raw.sideALabel || "후보 A").trim();
  const sideBLabel = (raw.sideBLabel || "후보 B").trim();
  const winnerName =
    winner === "A" ? sideALabel : winner === "B" ? sideBLabel : "무승부 (동률)";

  const criteriaBreakdown = Array.isArray(raw.criteriaBreakdown)
    ? raw.criteriaBreakdown.slice(0, 6).map((item) => {
        const rawScoreA = Number(item.scoreA);
        const rawScoreB = Number(item.scoreB);
        const sA = Math.max(
          1,
          Math.min(10, Number.isFinite(rawScoreA) ? Math.round(rawScoreA * 10) / 10 : 5)
        );
        const sB = Math.max(
          1,
          Math.min(10, Number.isFinite(rawScoreB) ? Math.round(rawScoreB * 10) / 10 : 5)
        );
        const edge: "A" | "B" | "TIE" = sA > sB ? "A" : sB > sA ? "B" : "TIE";
        return {
          criterion: String(item.criterion || "평가 항목").trim(),
          scoreA: sA,
          scoreB: sB,
          edge,
          reason: String(item.reason || "").trim(),
        };
      })
    : [];

  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .filter((s) => s && typeof s.uri === "string" && s.uri.startsWith("http"))
        .slice(0, 6)
    : [];

  return {
    winner,
    winnerName,
    sideALabel,
    sideBLabel,
    ratioA: clampedA,
    ratioB,
    headlineVerdict: String(raw.headlineVerdict || "").trim(),
    summaryReason: String(raw.summaryReason || "").trim(),
    decidingFactor: String(raw.decidingFactor || "").trim(),
    verificationNote: String(raw.verificationNote || "").trim(),
    criteriaBreakdown,
    sideAStrengths: Array.isArray(raw.sideAStrengths)
      ? raw.sideAStrengths.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
      : [],
    sideBStrengths: Array.isArray(raw.sideBStrengths)
      ? raw.sideBStrengths.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
      : [],
    recommendation: String(raw.recommendation || "").trim(),
    ...(sources.length > 0 ? { sources } : {}),
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "50mb" }));

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (req.path.startsWith("/api/") && err instanceof SyntaxError) {
        res.status(400).json({ error: "잘못된 JSON 요청 형식입니다." });
        return;
      }
      if (
        req.path.startsWith("/api/") &&
        typeof err === "object" &&
        err !== null &&
        "type" in err &&
        (err as { type?: string }).type === "entity.too.large"
      ) {
        res.status(413).json({
          error: "요청 이미지 용량이 너무 큽니다. 더 작은 이미지를 사용해 주세요.",
        });
        return;
      }
      next(err);
    }
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/compare", async (req, res) => {
    try {
      const body = (req.body ?? {}) as CompareRequestBody;
      const sideA = body.sideA ?? {};
      const sideB = body.sideB ?? {};

      const textA = typeof sideA.text === "string" ? sideA.text.trim() : "";
      const textB = typeof sideB.text === "string" ? sideB.text.trim() : "";
      const hasImageA =
        typeof sideA.imageBase64 === "string" && sideA.imageBase64.length > 0;
      const hasImageB =
        typeof sideB.imageBase64 === "string" && sideB.imageBase64.length > 0;

      if ((!textA && !hasImageA) || (!textB && !hasImageB)) {
        res.status(400).json({
          error: "후보 A와 후보 B 모두 사진 또는 주제를 하나 이상 입력해 주세요.",
        });
        return;
      }

      if (hasImageA && sideA.imageMimeType && !ALLOWED_MIME_TYPES.has(sideA.imageMimeType)) {
        res.status(400).json({
          error: "후보 A의 이미지 형식이 지원되지 않습니다. (JPEG, PNG, WEBP 지원)",
        });
        return;
      }

      if (hasImageB && sideB.imageMimeType && !ALLOWED_MIME_TYPES.has(sideB.imageMimeType)) {
        res.status(400).json({
          error: "후보 B의 이미지 형식이 지원되지 않습니다. (JPEG, PNG, WEBP 지원)",
        });
        return;
      }

      const focusKey =
        typeof body.focusCriterion === "string" && FOCUS_LABELS[body.focusCriterion]
          ? body.focusCriterion
          : "balanced";
      const focusInstruction = FOCUS_LABELS[focusKey];
      const focusDetail =
        typeof body.focusDetail === "string" ? body.focusDetail.trim() : "";

      const parts: Part[] = [
        {
          text: [
            "당신은 두 개의 사진이나 주제를 사실에 기반해 공정하고 정확하게 비교해 '몇 대 몇' 비율로 판정하는 검증 심판입니다.",
            "반드시 한국어로 자연스럽고 객관적으로 응답하세요.",
            "",
            `[평가 관점]: ${focusInstruction}`,
            focusDetail ? `[사용자 추가 조건]: ${focusDetail}` : "",
            "",
            "[거짓말·추측 금지(사실 검증) 엄수 원칙]",
            "1. 확인되지 않은 사실, 가짜 수치(가격, 출시일, 성능 벤치마크, 성분, 칼로리 등)를 절대 지어내지 마세요. 최신 제품·장소·정보 비교는 반드시 Google 검색으로 확인된 사실만 인용하세요.",
            "2. 사진이 포함된 경우 이미지에서 실제로 보이는 시각 정보(구도, 색감, 조명, 질감, 선명도, 적힌 글자, 피사체 상태)만 근거로 삼으세요. 사진에 보이지 않는 맛, 원산지, 가격, 브랜드, 촬영 장비를 임의로 단정하지 마세요.",
            "3. 후보 A의 특징과 후보 B의 특징을 절대 혼동하거나 뒤바꾸지 마세요.",
            "4. 정보 부족으로 단정할 수 없는 부분은 억지로 추측하지 말고 '사진/입력상 확인 불가' 또는 '개인 취향·사용 조건에 따라 달라짐'이라고 명시하고 verificationNote에 투명하게 밝히세요.",
            "5. 합이 정확히 100이 되는 정수 비율(ratioA + ratioB = 100)을 도출하고, criteriaBreakdown의 각 항목 점수가 최종 비율 및 승자와 논리적으로 일치하도록 평가하세요.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        {
          text: `\n--- [후보 A] ---\n${textA ? `설명/주제: ${textA}` : "설명 없음 (첨부된 사진으로 분석)"}`,
        },
      ];

      if (hasImageA && sideA.imageBase64) {
        parts.push({
          inlineData: {
            mimeType: sideA.imageMimeType || "image/jpeg",
            data: sideA.imageBase64,
          },
        });
      }

      parts.push({
        text: `\n--- [후보 B] ---\n${textB ? `설명/주제: ${textB}` : "설명 없음 (첨부된 사진으로 분석)"}`,
      });

      if (hasImageB && sideB.imageBase64) {
        parts.push({
          inlineData: {
            mimeType: sideB.imageMimeType || "image/jpeg",
            data: sideB.imageBase64,
          },
        });
      }

      const cacheKey = buildCacheKey({
        textA,
        textB,
        imageA: hasImageA && sideA.imageBase64 ? sideA.imageBase64 : "",
        imageB: hasImageB && sideB.imageBase64 ? sideB.imageBase64 : "",
        focusKey,
        focusDetail,
      });

      const cached = comparisonCache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      const ai = getGeminiClient();
      const hasAnyImage = hasImageA || hasImageB;
      let useLiteFallback = hasAnyImage;
      let useSearchTool = !hasAnyImage;

      const parsed = await withRetry(async (attempt) => {
        const modelName = useLiteFallback ? "gemini-3.1-flash-lite" : "gemini-4-hydrogen";
        try {
          const response: GenerateContentResponse = await withTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: { parts },
              config: {
                ...(useLiteFallback
                  ? {}
                  : {
                      thinkingConfig: {
                        thinkingLevel: ThinkingLevel.LOW,
                      },
                    }),
                ...(useSearchTool ? { tools: [{ googleSearch: {} }] } : {}),
                systemInstruction:
                  "사실 검증을 최우선으로 삼는 비교 판정관입니다. 사진에 없는 내용을 지어내거나 확인되지 않은 수치·스펙을 추측하지 않으며, 실제 관찰 가능한 시각 정보와 검색으로 검증된 사실만을 근거로 100점 만점 비율(ratioA + ratioB = 100)과 승패 이유를 간결하고 명확한 JSON으로 반환합니다.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  sideALabel: {
                    type: Type.STRING,
                    description: "후보 A를 대표하는 간결한 이름 (15자 이내 권장)",
                  },
                  sideBLabel: {
                    type: Type.STRING,
                    description: "후보 B를 대표하는 간결한 이름 (15자 이내 권장)",
                  },
                  ratioA: {
                    type: Type.INTEGER,
                    description: "후보 A의 우위 비율 (0~100 정수, ratioA + ratioB = 100)",
                  },
                  ratioB: {
                    type: Type.INTEGER,
                    description: "후보 B의 우위 비율 (0~100 정수, ratioA + ratioB = 100)",
                  },
                  winner: {
                    type: Type.STRING,
                    description: "'A', 'B', 또는 'TIE'",
                  },
                  winnerName: {
                    type: Type.STRING,
                    description: "승리한 후보 이름 또는 무승부",
                  },
                  headlineVerdict: {
                    type: Type.STRING,
                    description: "판정 결과를 요약하는 정확한 한 문장 결론",
                  },
                  summaryReason: {
                    type: Type.STRING,
                    description: "확인된 사실과 관찰 근거에 기반해 왜 이 비율이 나왔는지 설명하는 핵심 판정 이유 (2문장 이내로 간결하게)",
                  },
                  decidingFactor: {
                    type: Type.STRING,
                    description: "승패를 가른 결정적 한 가지 핵심 요인",
                  },
                  verificationNote: {
                    type: Type.STRING,
                    description: "확인한 근거 범위와 판단 한계점 요약 (1문장)",
                  },
                  criteriaBreakdown: {
                    type: Type.ARRAY,
                    description: "핵심 비교 항목 3개 점수 및 사실 기반 이유 (각 이유 1문장)",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        criterion: {
                          type: Type.STRING,
                          description: "비교 기준명 (예: 시각적 완성도, 실용성, 가성비 등)",
                        },
                        scoreA: {
                          type: Type.NUMBER,
                          description: "후보 A 점수 (1.0 ~ 10.0)",
                        },
                        scoreB: {
                          type: Type.NUMBER,
                          description: "후보 B 점수 (1.0 ~ 10.0)",
                        },
                        edge: {
                          type: Type.STRING,
                          description: "'A', 'B', 또는 'TIE'",
                        },
                        reason: {
                          type: Type.STRING,
                          description: "확인된 사실이나 이미지 내 실제 특징에 기반한 구체적 이유",
                        },
                      },
                      required: ["criterion", "scoreA", "scoreB", "edge", "reason"],
                    },
                  },
                  sideAStrengths: {
                    type: Type.ARRAY,
                    description: "확인된 사실 기반 후보 A의 핵심 강점 2~3가지 (각 1문장)",
                    items: { type: Type.STRING },
                  },
                  sideBStrengths: {
                    type: Type.ARRAY,
                    description: "확인된 사실 기반 후보 B의 핵심 강점 2~3가지 (각 1문장)",
                    items: { type: Type.STRING },
                  },
                  recommendation: {
                    type: Type.STRING,
                    description: "어떤 상황에서는 A를, 어떤 상황에서는 B를 선택하면 좋은지 실용적 가이드 (1~2문장)",
                  },
                },
                required: [
                  "sideALabel",
                  "sideBLabel",
                  "ratioA",
                  "ratioB",
                  "winner",
                  "winnerName",
                  "headlineVerdict",
                  "summaryReason",
                  "decidingFactor",
                  "verificationNote",
                  "criteriaBreakdown",
                  "sideAStrengths",
                  "sideBStrengths",
                  "recommendation",
                ],
              },
            },
            }),
            10500
          );

          const rawText = (response.text ?? "").trim();
          if (!rawText) {
            throw new Error("EMPTY_MODEL_RESPONSE");
          }

          let cleanJson = rawText;
          const fenceMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (fenceMatch && fenceMatch[1]) {
            cleanJson = fenceMatch[1].trim();
          } else {
            const firstBrace = cleanJson.indexOf("{");
            const lastBrace = cleanJson.lastIndexOf("}");
            if (firstBrace >= 0 && lastBrace > firstBrace) {
              cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
            }
          }

          const parsedJson = JSON.parse(cleanJson) as ComparisonResponse;

          const groundingChunks =
            response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (Array.isArray(groundingChunks)) {
            const extractedSources: GroundingSource[] = [];
            const seenUris = new Set<string>();
            for (const chunk of groundingChunks) {
              const uri = chunk?.web?.uri;
              const title = chunk?.web?.title;
              if (typeof uri === "string" && uri.startsWith("http") && !seenUris.has(uri)) {
                seenUris.add(uri);
                extractedSources.push({
                  title: (typeof title === "string" && title.trim()) || uri,
                  uri,
                });
              }
            }
            if (extractedSources.length > 0) {
              parsedJson.sources = extractedSources;
            }
          }

          return parsedJson;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (isRateLimitError(err) || msg.includes("UPSTREAM_TIMEOUT")) {
            useSearchTool = false;
            if (attempt < 3) {
              useLiteFallback = true;
            }
          }
          if (
            useSearchTool &&
            (msg.includes("400") || msg.includes("INVALID_ARGUMENT") || msg.includes("Tool"))
          ) {
            useSearchTool = false;
            throw new Error("EMPTY_MODEL_RESPONSE");
          }
          throw err;
        }
      }, 3);

      const normalized = normalizeResult(parsed);
      setCachedComparison(cacheKey, normalized);
      res.json(normalized);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[/api/compare] Error:", message);

      if (message === "API_KEY_MISSING" || message.includes("API_KEY_INVALID")) {
        res.status(400).json({
          error:
            "Gemini API 키가 설정되지 않았거나 유효하지 않습니다. Settings > Secrets 패널에서 GEMINI_API_KEY를 확인해 주세요.",
        });
        return;
      }
      if (message.includes("PERMISSION_DENIED") || message.includes("403")) {
        res.status(403).json({
          error:
            "API 권한이 거부되었습니다. Settings > Secrets 패널에서 API 키 권한을 확인해 주세요.",
        });
        return;
      }
      if (message.includes("RESOURCE_EXHAUSTED") || message.includes("429")) {
        res.status(429).json({
          error:
            "현재 연결된 Gemini API 무료 티어 요청 한도에 도달했습니다. 약 1분 후 다시 시도하시거나, Settings > Secrets 패널에서 결제가 활성화된 API 키를 선택하면 한도 제한 없이 이용할 수 있습니다.",
        });
        return;
      }

      const shortDetail = message.replace(/AIza[0-9A-Za-z_-]+/g, "***").slice(0, 240);
      res.status(500).json({
        error: `비교 판정 처리 중 오류가 발생했습니다: ${shortDetail}`,
      });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
