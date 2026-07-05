import { config } from "./config.js";
import { embed } from "./rag/embed.js";
import { loadStore, topK } from "./rag/store.js";

const SYSTEM_PROMPT = (
  botName,
  company
) => `당신은 ${company}의 고객 상담봇 "${botName}"입니다.

규칙:
1. 아래 <문서> 안의 내용만 근거로 답합니다. 문서에 없는 내용은 추측하지 말고 "해당 내용은 확인해 드리기 어렵습니다. 상담원 연결을 도와드릴까요?"라고 답합니다.
2. 답변 끝에 근거 문서를 [출처: 파일명] 형식으로 표기합니다.
3. 답변은 카카오톡에서 읽기 좋게 3~5문장, 존댓말로.
4. 가격·환불·법적 책임 관련 질문은 문서에 명시된 경우에만 답하고, 아니면 상담원 연결을 안내합니다.`;

async function generateGemini(system, user) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.2 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API 오류 ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Gemini 응답이 비어 있습니다: " + JSON.stringify(json).slice(0, 300));
  return text;
}

async function generateClaude(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API 오류 ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content[0].text;
}

let store; // lazy load + 캐시 (비어 있으면 매 요청 재시도 — 부팅 ingest 완료 전 캐시 고착 방지)

export async function answer(question) {
  if (!store || store.chunks.length === 0) store = loadStore();
  if (store.chunks.length === 0) {
    return { text: "지식베이스가 비어 있습니다. `npm run ingest -- ./docs` 를 먼저 실행하세요.", sources: [] };
  }

  const [queryVec] = await embed(question);
  const hits = topK(store, queryVec, 4);

  if (hits.length === 0) {
    return {
      text: "해당 내용은 확인해 드리기 어렵습니다. 상담원 연결을 도와드릴까요?",
      sources: [],
    };
  }

  const context = hits
    .map((h) => `<문서 파일명="${h.source}" 관련도="${h.score.toFixed(2)}">\n${h.text}\n</문서>`)
    .join("\n\n");

  const system = SYSTEM_PROMPT(config.bot.name, config.bot.company);
  const user = `${context}\n\n고객 질문: ${question}`;
  const text =
    config.provider === "gemini"
      ? await generateGemini(system, user)
      : await generateClaude(system, user);

  return { text, sources: [...new Set(hits.map((h) => h.source))] };
}
