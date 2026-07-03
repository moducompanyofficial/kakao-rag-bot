import express from "express";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { config } from "./config.js";
import { kakaoRouter } from "./channels/kakao.js";
import { webRouter } from "./channels/web.js";

// 부팅 시 지식베이스가 없고 API 키가 있으면 자동 ingest (배포 환경 편의)
if (!fs.existsSync(config.storePath) && (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)) {
    const ingestPath = new URL("./rag/ingest.js", import.meta.url).pathname;
    const docsPath = new URL("../docs", import.meta.url).pathname;
    execFile("node", [ingestPath, docsPath], (err, stdout, stderr) => {
          if (err) console.error("[auto-ingest 실패]", stderr || err.message);
          else console.log("[auto-ingest 완료]", stdout.trim());
    });
}

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(new URL("../public", import.meta.url).pathname));

app.use("/kakao", kakaoRouter);
app.use("/api", webRouter);

app.get("/health", (_req, res) => res.json({ ok: true, bot: config.bot.name }));

app.listen(config.port, () => {
    console.log(`[${config.bot.name}] http://localhost:${config.port}`);
    console.log(`- 웹 데모:     http://localhost:${config.port}/`);
    console.log(`- 카카오 스킬: POST /kakao/skill`);
});
