import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI, ThinkingLevel, Type} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

interface ContenderPayload {
  label?: string;
  imageBase64?: string | null;
  mimeType?: string | null;
}

interface CompareRequestBody {
  contenderA?: ContenderPayload;
  contenderB?: ContenderPayload;
  focusCriteria?: string;
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label}:UPSTREAM_TIMEOUT`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

const comparisonSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Short Korean headline summarizing the matchup (e.g. "아이폰 16 프로 vs 갤럭시 S25 울트라").',
    },
    contenderAName: {
      type: Type.STRING,
      description: 'Refined Korean display name for Contender A.',
    },
    contenderBName: {
      type: Type.STRING,
      description: 'Refined Korean display name for Contender B.',
    },
    ratioA: {
      type: Type.INTEGER,
      description: 'Percentage score for Contender A (0-100). ratioA + ratioB must equal 100.',
    },
    ratioB: {
      type: Type.INTEGER,
      description: 'Percentage score for Contender B (0-100). ratioA + ratioB must equal 100.',
    },
    winner: {
      type: Type.STRING,
      description: 'Must be "A", "B", or "TIE".',
    },
    verdictHeadline: {
      type: Type.STRING,
      description: 'Crisp one-sentence Korean verdict headline announcing why the winner edges ahead.',
    },
    decidingReason: {
      type: Type.STRING,
      description: 'Detailed 2-3 sentence Korean explanation of the core deciding reason behind the ratio.',
    },
    finisherMove: {
      type: Type.STRING,
      description: 'Short energetic Korean finisher phrase describing the decisive blow (under 18 characters).',
    },
    criteriaBreakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion: {type: Type.STRING, description: 'Criterion name in Korean (3-5 items total).'},
          scoreA: {type: Type.INTEGER, description: 'Score for A out of 100.'},
          scoreB: {type: Type.INTEGER, description: 'Score for B out of 100.'},
          insight: {type: Type.STRING, description: 'One concise Korean sentence comparing A and B on this criterion.'},
        },
        required: ['criterion', 'scoreA', 'scoreB', 'insight'],
      },
    },
    strengthsA: {
      type: Type.ARRAY,
      items: {type: Type.STRING},
      description: '2-3 concise Korean bullet points for Contender A strengths.',
    },
    strengthsB: {
      type: Type.ARRAY,
      items: {type: Type.STRING},
      description: '2-3 concise Korean bullet points for Contender B strengths.',
    },
  },
  required: [
    'title',
    'contenderAName',
    'contenderBName',
    'ratioA',
    'ratioB',
    'winner',
    'verdictHeadline',
    'decidingReason',
    'finisherMove',
    'criteriaBreakdown',
    'strengthsA',
    'strengthsB',
  ],
};

function sanitizeResult(raw: Record<string, unknown>, fallbackA: string, fallbackB: string) {
  let ratioA = Number(raw.ratioA);
  let ratioB = Number(raw.ratioB);
  if (!Number.isFinite(ratioA) || !Number.isFinite(ratioB) || ratioA < 0 || ratioB < 0 || ratioA + ratioB <= 0) {
    ratioA = 50;
    ratioB = 50;
  } else {
    const sum = ratioA + ratioB;
    ratioA = Math.round((ratioA / sum) * 100);
    ratioB = 100 - ratioA;
  }

  let winner: 'A' | 'B' | 'TIE' = 'TIE';
  if (ratioA > ratioB) winner = 'A';
  else if (ratioB > ratioA) winner = 'B';

  const criteriaRaw = Array.isArray(raw.criteriaBreakdown) ? raw.criteriaBreakdown : [];
  const criteriaBreakdown = criteriaRaw.slice(0, 5).map((item) => {
    const rec = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      criterion: String(rec.criterion || '종합 균형'),
      scoreA: Math.min(100, Math.max(0, Math.round(Number(rec.scoreA) || 50))),
      scoreB: Math.min(100, Math.max(0, Math.round(Number(rec.scoreB) || 50))),
      insight: String(rec.insight || '두 후보가 대등한 수준을 보입니다.'),
    };
  });

  const strengthsA = Array.isArray(raw.strengthsA)
    ? raw.strengthsA.map((s) => String(s)).filter(Boolean).slice(0, 3)
    : [];
  const strengthsB = Array.isArray(raw.strengthsB)
    ? raw.strengthsB.map((s) => String(s)).filter(Boolean).slice(0, 3)
    : [];

  return {
    title: String(raw.title || `${fallbackA} vs ${fallbackB}`),
    contenderAName: String(raw.contenderAName || fallbackA),
    contenderBName: String(raw.contenderBName || fallbackB),
    ratioA,
    ratioB,
    winner,
    verdictHeadline: String(raw.verdictHeadline || '다각도 기준 비교 결과 우위가 결정되었습니다.'),
    decidingReason: String(raw.decidingReason || '핵심 평가 기준 전반에서 근소한 차이가 판정을 갈랐습니다.'),
    finisherMove: String(raw.finisherMove || '결정적 한 방 승부!'),
    criteriaBreakdown,
    strengthsA,
    strengthsB,
  };
}

function parseJsonResponse(text: string | undefined): Record<string, unknown> {
  const cleaned = (text ?? '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  if (!cleaned) {
    throw new Error('EMPTY_MODEL_RESPONSE');
  }
  return JSON.parse(cleaned) as Record<string, unknown>;
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '15mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({ok: true});
  });

  app.post('/api/compare', async (req, res) => {
    try {
      const body = (req.body || {}) as CompareRequestBody;
      const contenderA = body.contenderA || {};
      const contenderB = body.contenderB || {};
      const focusCriteria = (body.focusCriteria || '').trim();

      const labelA = (contenderA.label || '').trim();
      const labelB = (contenderB.label || '').trim();
      const hasImageA = Boolean(contenderA.imageBase64 && contenderA.mimeType);
      const hasImageB = Boolean(contenderB.imageBase64 && contenderB.mimeType);

      if ((!labelA && !hasImageA) || (!labelB && !hasImageB)) {
        res.status(400).json({
          error: '후보 A와 후보 B 모두 텍스트 또는 이미지를 입력해 주세요.',
        });
        return;
      }

      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다. Settings > Secrets 또는 .env 파일을 확인해 주세요.',
        });
        return;
      }

      const fallbackA = labelA || '후보 A';
      const fallbackB = labelB || '후보 B';

      const parts: Array<{text: string} | {inlineData: {mimeType: string; data: string}}> = [];

      const promptLines = [
        '당신은 공정하고 날카로운 비교 판정 전문가입니다.',
        `후보 A: ${fallbackA}${hasImageA ? ' (첨부 이미지 A 참고)' : ''}`,
        `후보 B: ${fallbackB}${hasImageB ? ' (첨부 이미지 B 참고)' : ''}`,
        focusCriteria
          ? `중점 비교 기준: ${focusCriteria}`
          : '중점 비교 기준: 실용성, 완성도/품질, 가성비 또는 매력도 등 주제에 가장 적합한 4가지 핵심 기준을 선정하세요.',
        '',
        '요구사항:',
        '1. 두 후보(사진이 있다면 시각적 디테일, 구도, 상태, 품질, 분위기까지 포함)를 객관적이고 흥미롭게 비교해 몇 대 몇(ratioA : ratioB, 합계 100) 비율로 판정하세요.',
        '2. 무승부(50:50)는 실제로 완전히 동등한 경우에만 사용하고, 웬만하면 미세한 차이라도 판정 비율에 반영하세요.',
        '3. 모든 텍스트는 자연스럽고 명쾌한 한국어로 작성하고, JSON 스키마를 정확히 따르세요.',
      ];

      parts.push({text: promptLines.join('\n')});

      if (hasImageA && contenderA.imageBase64 && contenderA.mimeType) {
        parts.push({text: '[후보 A 이미지]'});
        parts.push({
          inlineData: {
            mimeType: contenderA.mimeType,
            data: contenderA.imageBase64,
          },
        });
      }

      if (hasImageB && contenderB.imageBase64 && contenderB.mimeType) {
        parts.push({text: '[후보 B 이미지]'});
        parts.push({
          inlineData: {
            mimeType: contenderB.imageBase64,
            data: contenderB.imageBase64,
          },
        });
      }

      const systemInstruction =
        'Return strictly valid JSON matching the schema. All copy must be crisp Korean. ratioA + ratioB must equal 100.';

      let response;
      const canUseSearch = !hasImageA && !hasImageB;

      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: {parts},
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: comparisonSchema,
              thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
              ...(canUseSearch ? {tools: [{googleSearch: {}}]} : {}),
            },
          }),
          14000,
          'primary',
        );
      } catch (primaryError) {
        console.warn('Primary Gemini call failed, falling back to gemini-3.1-flash-lite:', primaryError);
        response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: {parts},
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: comparisonSchema,
            },
          }),
          14000,
          'fallback',
        );
      }

      const parsed = parseJsonResponse(response.text);
      const sanitized = sanitizeResult(parsed, fallbackA, fallbackB);

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = rawChunks
        .map((chunk) => {
          const web = chunk.web;
          if (!web?.uri) return null;
          return {
            title: web.title || web.uri,
            uri: web.uri,
          };
        })
        .filter((s): s is {title: string; uri: string} => s !== null)
        .slice(0, 4);

      res.json({
        ...sanitized,
        sources,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Compare API error:', error);

      if (message.includes('UPSTREAM_TIMEOUT')) {
        res.status(504).json({error: '판정 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'});
        return;
      }
      if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED') || message.includes('403')) {
        res.status(403).json({error: 'Gemini API 키가 유효하지 않거나 권한이 없습니다. Settings > Secrets를 확인해 주세요.'});
        return;
      }
      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        res.status(429).json({error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'});
        return;
      }

      res.status(500).json({error: '비교 판정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'});
    }
  });

  if (!isProduction) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
