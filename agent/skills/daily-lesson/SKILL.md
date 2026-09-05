---
name: daily-lesson
description: Build a compact Korean review lesson or paginated Learning-pile view from the learner's current words, expressions, and grammar.
---

# Daily Korean lesson

Use this skill when the learner asks for today's lesson, a daily review, practice using the current Learning pile, or a list of it.

## Workflow

1. Search Supermemory for the exact `EVE_KOREAN_LEARNING_PILE` record and retrieve the complete current list of words, expressions, and grammar structures marked **Learning**, including any compact example sentence or context saved with each item. Treat only a result containing that exact heading as canonical; do not assemble the list from scattered per-item memories. If an older clearly consolidated Learning-pile record appears without the heading, migrate that one record once. If no consolidated record exists, seed the canonical record from clearly identified Learning records, deduplicate canonical forms, and use it thereafter.
2. Choose one to three items, prioritising recent or active Learning items and mixing words, expressions, and grammar when useful. Do not present **Unseen** items as review, and keep **Seen** items out unless the learner explicitly asks for them.
3. For each item, present a saved example when one is available. If there is no useful saved example, write one or two fresh, natural examples that use the item in context. Label a saved example as source/context when its origin is known; label a new one as tutor-created. Do not reproduce a full stored transcript.
4. Explain meaning, nuance, and register briefly. Keep the lesson roughly 70% Korean and 30% English, with Korean in Hangul only. Never generate, add, or repeat romanization or transliteration.
5. End with a short retrieval prompt or mini practice question so the learner uses the items.

## Pile view

- If the learner asks to see or list their Learning words, show at most 10 entries per message and label the range, for example `Learning items 1–10 of 24`.
- Keep the canonical record in its existing order. “Next” and “previous” paginate that same retrieved list; do not save pages as new memories or reorder the stored pile just to display it.
- If the retrieved record is incomplete, search again for the exact heading before reporting a count or inventing missing entries.

## State handling

- Showing a Learning item in a daily lesson does not change its state.
- Move **Learning → Seen** only after the learner explicitly says the item is familiar or should stop being recommended.
- Move **Seen → Learning** when the learner explicitly asks to review it or says it still needs practice.
- If the learner adopts an **Unseen** item during the lesson, record it as **Learning**.
- If no canonical Learning record or items are returned, say that the learning pile is empty. Do not invent a stored item; suggest sentence mining or ask what the learner wants to study.

Keep the response compact and conversational. This skill reviews the existing Learning pile; it does not browse for new source material. Use `sentence-mine` when the learner wants fresh examples from YouTube or Naver.
