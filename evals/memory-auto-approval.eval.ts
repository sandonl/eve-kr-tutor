import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "The private tutor automatically approves a concise numbered canonical language-state memory write.",
  async test(test) {
    await test.send(
      "Add 눈치, 서운하다, and 어색하다 to the canonical EVE_KOREAN_LEARNING_PILE memory as numbered Learning items. Give each a stable four-digit item number and keep the state explicit so the list stays consolidated. Do not create separate per-item memories.",
    );

    test.succeeded();
    test.calledTool("supermemory__add_memory", {
      input: {
        action: "save",
        content: /EVE_KOREAN_LEARNING_PILE[\s\S]*#\d{4}[\s\S]*(?:state:\s*)?Learning/i,
      },
      count: (count) => count >= 1,
    });
  },
});
