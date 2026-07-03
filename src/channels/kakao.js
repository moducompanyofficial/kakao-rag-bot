import { Router } from "express";
import { answer } from "../llm.js";

/**
 * 카카오 i 오픈빌더 스킬 서버 (응답 포맷 v2.0).
 * 오픈빌더에서 폴백 블록 → 스킬 연결 → URL: https://<도메인>/kakao/skill
 *
 * 주의: 오픈빌더 타임아웃은 5초. RAG+LLM이 5초를 넘길 수 있으므로
 * 운영 시에는 AI 챗봇 콜백 기능(useCallback) 승인을 신청해 콜백 모드로 전환할 것.
 * 데모/저지연 환경에서는 동기 응답으로 충분.
 */

export const kakaoRouter = Router();

const simpleText = (text) => ({
  version: "2.0",
  template: { outputs: [{ simpleText: { text } }] },
});

kakaoRouter.post("/skill", async (req, res) => {
  const utterance = req.body?.userRequest?.utterance?.trim();
  if (!utterance) {
    return res.json(simpleText("질문을 이해하지 못했습니다. 다시 입력해 주세요."));
  }

  // 콜백 모드 (오픈빌더에서 AI 챗봇 전환 승인 시 req.body.userRequest.callbackUrl 제공)
  const callbackUrl = req.body?.userRequest?.callbackUrl;
  if (callbackUrl) {
    res.json({ version: "2.0", useCallback: true });
    try {
      const { text } = await answer(utterance);
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simpleText(text)),
      });
    } catch (e) {
      console.error("[kakao callback] ", e);
      await fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simpleText("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")),
      }).catch(() => {});
    }
    return;
  }

  // 동기 모드
  try {
    const { text } = await answer(utterance);
    res.json(simpleText(text));
  } catch (e) {
    console.error("[kakao skill] ", e);
    res.json(simpleText("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."));
  }
});
