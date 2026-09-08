---
name: daily-lesson
description: Use for /lesson, scheduled daily lessons, "whats todays lesson", "what are we learning today", daily reviews, or Learning-pile requests. Build a Korean review from current Learning words, expressions, and grammar.
---

# Daily Korean lesson

Use this skill when the learner asks for today's lesson, a scheduled daily lesson runs, a daily review is requested, practice uses the current Learning pile, or the learner asks for a list of it.

Treat `/lesson`, “what's today's lesson?”, “whats todays lesson”, and “what are we learning today?” as requests to start the lesson, not questions about available features. Recognize equivalent wording regardless of capitalization or punctuation; begin the workflow without asking the learner to choose a topic.

## Workflow

1. Search Supermemory for the exact `EVE_KOREAN_LEARNING_PILE` record and retrieve the complete numbered state index, including stable item numbers, states, and compact examples or context. Treat only a result containing that exact heading as canonical; do not assemble the list from scattered per-item memories. If an older clearly consolidated or unnumbered Learning-pile record appears, migrate it once on a successful complete replacement. If no canonical record exists, say the Learning pile is empty; do not invent stored items.
2. Filter to entries whose state is exactly **Learning**. For a manual lesson, choose one to three items unless the learner asks for more. For a scheduled daily lesson, aim for 10: use exactly 10 when at least 10 Learning items exist, otherwise use every current Learning item. If there are more than 10, vary the stable item numbers across days rather than always using the first ten. Never present **Unseen** items as review, and keep **Seen** items out unless the learner explicitly asks for them.
3. Number every presented item with its stable item number, such as `#0007`; never renumber the day's lesson as a temporary 1–10 list. For each item, present a saved example when one is useful. If there is no useful saved example, write one or two fresh, natural examples that use the item in context. Label a saved example as source/context when its origin is known; label a new one as tutor-created. Do not reproduce a full stored transcript.
4. Explain meaning, nuance, and register briefly. Keep the lesson roughly 70% Korean and 30% English, with Korean in Hangul only. Never generate, add, or repeat romanization or transliteration.
5. End with a short retrieval prompt or mini practice question that can refer to the stable item numbers. Showing or reviewing an item does not change its state.

## Pile view

- If the learner asks to see or list their Learning words, show at most 10 entries per message and label the range, for example `Learning items 1–10 of 24`.
- Keep the canonical record in its existing order. “Next” and “previous” paginate that same retrieved list; do not save pages as new memories or reorder the stored pile just to display it.
- If the retrieved record is incomplete, search again for the exact heading before reporting a count or inventing missing entries. Count only entries whose state is exactly `Learning`.

## State handling

- Showing a Learning item in a daily lesson does not change its state or stable item number.
- Move **Learning → Seen** only after the learner explicitly says the item is familiar or should stop being recommended.
- Move **Seen → Learning** when the learner explicitly asks to review it or says it still needs practice.
- If the learner adopts an **Unseen** item during the lesson, record it as **Learning**.
- If no canonical Learning record or items are returned, say that the learning pile is empty. Do not invent a stored item; suggest sentence mining or ask what the learner wants to study.

Keep the response compact and conversational. This skill reviews the existing Learning pile; it does not browse for new source material. Use `sentence-mine` when the learner wants fresh examples from YouTube or Naver.
