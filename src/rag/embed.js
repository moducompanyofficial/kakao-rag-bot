import { config } from "../config.js";

/**
 * 임베딩 프로바이더 자동 선택.
 * - gemini: Google AI Studio 무료 티어 (기본, 비용 0)
 * - openai: 납품/업그레이드용
 */

async function embedGemini(inputs) {
  const model = `models/${config.gemini.embeddingModel}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:batchEmbedContents?key=${config.gemini.apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: inputs.map((text) => ({
          model,
          content: { parts: [{ text }] },
        })),
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini 임베딩 오류 ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.embeddings.map((e) => e.values);
}

async function embedOpenAI(inputs) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openai.apiKey()}`,
    },
    body: JSON.stringify({ model: config.openai.embeddingModel, input: inputs }),
  });
  if (!res.ok) throw new Error(`OpenAI 임베딩 오류 ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

export async function embed(texts) {
  const inputs = Array.isArray(texts) ? texts : [texts];
  return config.provider === "gemini" ? embedGemini(inputs) : embedOpenAI(inputs);
}
