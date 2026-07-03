import fs from "node:fs";
import path from "node:path";
import { embed } from "./embed.js";
import { saveStore } from "./store.js";

/**
 * 사용법: npm run ingest -- ./docs
 * .md/.txt 파일을 헤딩·문단 기준으로 청크 분할 → 임베딩 → data/store.json 저장.
 */

function chunkMarkdown(text, source) {
  // 헤딩 기준 1차 분할, 길면 문단 기준 2차 분할 (청크당 최대 ~1200자)
  const sections = text.split(/(?=^#{1,3} )/m).filter((s) => s.trim());
  const chunks = [];
  for (const section of sections) {
    if (section.length <= 1200) {
      chunks.push(section.trim());
      continue;
    }
    const heading = section.match(/^#{1,3} .*$/m)?.[0] ?? "";
    let buf = heading;
    for (const para of section.split(/\n\n+/)) {
      if ((buf + "\n\n" + para).length > 1200) {
        chunks.push(buf.trim());
        buf = heading + "\n\n" + para; // 헤딩 컨텍스트 유지
      } else {
        buf += "\n\n" + para;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
  }
  return chunks.map((text, i) => ({ id: `${source}#${i}`, source, text }));
}

async function main() {
  const dir = process.argv[2] || "./docs";
  const files = fs.readdirSync(dir).filter((f) => /\.(md|txt)$/.test(f));
  if (files.length === 0) {
    console.error(`${dir} 에 .md/.txt 파일이 없습니다.`);
    process.exit(1);
  }

  const allChunks = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf-8");
    allChunks.push(...chunkMarkdown(text, file));
  }
  console.log(`${files.length}개 파일 → ${allChunks.length}개 청크. 임베딩 중...`);

  // 배치 처리 (API 요청당 최대 100개)
  const vectors = [];
  for (let i = 0; i < allChunks.length; i += 100) {
    const batch = allChunks.slice(i, i + 100);
    vectors.push(...(await embed(batch.map((c) => c.text))));
  }

  saveStore({
    createdAt: new Date().toISOString(),
    chunks: allChunks.map((c, i) => ({ ...c, vector: vectors[i] })),
  });
  console.log(`완료: data/store.json (${allChunks.length} 청크)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
