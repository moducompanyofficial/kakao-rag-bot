import "dotenv/config";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 이(가) 설정되지 않았습니다. .env 파일을 확인하세요.`);
  return v;
}

/**
 * 프로바이더 자동 선택:
 * - GEMINI_API_KEY만 있으면 → Gemini 무료 티어로 임베딩+생성 모두 처리 (기본, 비용 0)
 * - ANTHROPIC/OPENAI 키가 있으면 → 생성은 Claude, 임베딩은 OpenAI (납품·업그레이드용)
 */
const useGemini = !!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY;

export const config = {
  port: Number(process.env.PORT || 3000),
  provider: useGemini ? "gemini" : "anthropic+openai",
  gemini: {
    apiKey: () => required("GEMINI_API_KEY"),
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  },
  anthropic: {
    apiKey: () => required("ANTHROPIC_API_KEY"),
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  },
  openai: {
    apiKey: () => required("OPENAI_API_KEY"),
    embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  },
  bot: {
    name: process.env.BOT_NAME || "AI 상담봇",
    company: process.env.BOT_COMPANY || "우리 회사",
  },
  storePath: new URL("../data/store.json", import.meta.url).pathname,
};
