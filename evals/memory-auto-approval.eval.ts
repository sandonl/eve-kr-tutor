import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "The private tutor automatically approves a concise canonical Learning-pile memory write.",
  async test(test) {
    await test.send(
      "Add 눈치, 서운하다, and 어색하다 to the canonical EVE_KOREAN_LEARNING_PILE memory as Learning items so the list stays consolidated. Do not create separate per-item memories.",
    );

    test.succeeded();
    test.calledTool("supermemory__add_memory", {
      input: {
        action: "save",
        content: /EVE_KOREAN_LEARNING_PILE/,
      },
      count: (count) => count >= 1,
    });
  },
});
