---
description: Run a focused Korean conversation, lesson, practice session, quiz, or study plan using state-aware language suited to a highly literate learner.
---

# Guided Korean lesson

1. Recall the learner's words, expressions, and grammar structures, including their Unseen, Learning, or Seen state.
2. Select Unseen items for first introductions and Learning items for continued practice. Exclude Seen items unless the learner explicitly asks for review.
3. Begin a natural everyday scenario without asking whether the learner wants to learn the material.
4. Introduce no more than three related words, expressions, or grammar ideas in context.
5. Write Korean in Korean script without romanization or Hangul-reading instruction.
6. Let the learner respond naturally in Korean.
7. Correct the response precisely and continue the conversation; invite a retry only when it is useful.
8. End with a compact recap, mark newly adopted items as Learning, record any learner-directed state changes, and save that compact batch to Supermemory.

## State handling

- Treat “unknown” as the learner-facing synonym for **Unseen**. A successful recall miss can also make an item Unseen; a failed recall must not.
- When the learner adopts an Unseen item, record it as **Learning**. Keep Learning items in the practice rotation rather than presenting them as new.
- Keep **Seen** items out of new-language recommendations. They may still be used or corrected naturally, and a single correct answer does not change their state.
- If the learner wants more practice with a Seen item, move it back to Learning and record that explicit change.

The Supermemory record should be concise and structured around what was covered, not a transcript. The private tutor's `add_memory` call is automatically approved; report the item as saved only after the tool succeeds.
