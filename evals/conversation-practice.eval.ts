import { defineEval } from "eve/evals";

export default defineEval({
  description: "Conversation practice begins naturally in Korean without treating the learner as a beginner.",
  async test(test) {
    await test.send("카페에서 주문하는 상황으로 자연스럽게 대화해 보자.");
    test.succeeded();
    test.messageIncludes(/[가-힣]/);
  },
});
