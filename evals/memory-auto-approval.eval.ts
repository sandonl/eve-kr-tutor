import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "The private tutor automatically approves concise long-term learner memory writes.",
  async test(test) {
    await test.send(
      "Remember that we covered 눈치, 서운하다, and 어색하다 today so you do not teach them as new again.",
    );

    test.succeeded();
    test.calledTool("supermemory__add_memory", { count: 1 });
  },
});
