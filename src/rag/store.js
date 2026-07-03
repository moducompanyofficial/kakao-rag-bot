import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

/**
 * 파일 기반 벡터 스토어 (데모 규모: 수천 청크까지 충분).
 * 운영 전환 포인트: pgvector / Qdrant로 이 파일만 교체하면 됨 — 인터페이스 동일.
 */

export function loadStore() {
  if (!fs.existsSync(config.storePath)) return { chunks: [] };
  return JSON.parse(fs.readFileSync(config.storePath, "utf-8"));
}

export function saveStore(store) {
  fs.mkdirSync(path.dirname(config.storePath), { recursive: true });
  fs.writeFileSync(config.storePath, JSON.stringify(store));
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topK(store, queryVec, k = 4, minScore = 0.25) {
  return store.chunks
    .map((c) => ({ ...c, score: cosine(queryVec, c.vector) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .filter((c) => c.score >= minScore);
}
