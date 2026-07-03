import { Router } from "express";
import { answer } from "../llm.js";

/** 웹 데모용 채팅 API — public/index.html에서 호출 */
export const webRouter = Router();

webRouter.post("/chat", async (req, res) => {
  const question = req.body?.question?.trim();
  if (!question) return res.status(400).json({ error: "question이 비어 있습니다." });
  if (question.length > 500) return res.status(400).json({ error: "질문이 너무 깁니다(500자 제한)." });

  try {
    const result = await answer(question);
    res.json(result);
  } catch (e) {
    console.error("[web chat] ", e);
    res.status(500).json({ error: "일시적인 오류가 발생했습니다." });
  }
});
