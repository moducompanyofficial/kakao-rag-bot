import express from "express";
import { config } from "./config.js";
import { kakaoRouter } from "./channels/kakao.js";
import { webRouter } from "./channels/web.js";

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
