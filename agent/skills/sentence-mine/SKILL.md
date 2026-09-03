---
name: sentence-mine
description: Mine short, natural Korean sentences from YouTube or Naver media for fresh lessons and daily digests.
---

# Korean sentence mining

Use this skill when the learner asks to find, fetch, or mine Korean examples from YouTube or Naver, or when a scheduled sentence digest runs.

## Preferred sources

- At the start of every mining run, use Supermemory's `search_memory` with a source-preference query to retrieve the learner's preferred YouTube and media source list. Use only records about source preferences; ignore any stored words, sentences, or grammar returned alongside them. Do not rely on hardcoded names or the current prompt alone.
- Treat the learner's saved preferred-source list as an ordered first choice. Try those sources before generic discovery.
- If a preferred source has no accessible, verifiable material, move to the next one. Use a non-preferred fallback only after the list is exhausted, and say that you did so.
- Keep source preferences separate from language-item states: preferring a channel does not mean the learner has seen any sentence, word, or grammar from it.

## Fresh-source rule

- Supermemory is a preference and state filter, not the content feed. Do not query it for stored sentence content or Learning examples, and do not copy any such records into the response.
- Every mine must come from a new, verifiable page fetched during this run. Do not re-elicit or review a stored Learning item through this skill.
- After extracting a fresh candidate, use only the candidate's state metadata to reject duplicate targets: selected teaching targets must be **Unseen**. Familiar language may occur incidentally in a source sentence, but it is not a mine unless the target itself is Unseen. Never surface the stored record used for the check.
- If the preferred sources produce no new candidate, say so instead of filling the response with stored material.

## Find usable source material

1. Do not recall stored Learning material. Use the Supermemory lookup above for source preferences, and use only narrow state metadata checks after finding a fresh candidate.
2. Search in Korean with `web_search`, restricting results to YouTube or a specific Naver media domain such as `news.naver.com`, `entertain.naver.com`, or `tv.naver.com`. Prefer a channel or publication the learner already follows; otherwise choose a current, ordinary-life topic.
3. Use `web_fetch` only on a result page that is relevant and accessible. Do not download video or audio, bypass a login, paywall, robots rule, or region restriction, or scrape comments.
4. Treat YouTube speech as evidence only when a transcript or caption text is actually available. If it is not available, do not invent a spoken line from a title, thumbnail, or description; offer the link as a candidate and say what is missing.
5. For Naver, prefer an accessible article body over a headline. Headlines and search snippets are discovery clues, not conversational examples.

## Select the mines

- Choose one to three short examples that sound like everyday spoken Korean, have enough context to understand, and teach a useful expression or grammar pattern.
- Prefer natural contractions, sentence endings, and pragmatic nuance over isolated dictionary forms. Skip sensational, hateful, sexual, or otherwise distracting material unless the learner asks for it.
- Do not select a **Learning** or **Seen** item as the teaching target. Keep every selected mine **Unseen** until the learner adopts it.
- A daily digest should stay compact: normally one or two fresh **Unseen** mines. If no source provides a safe, verifiable example, say so instead of fabricating one.

## Teach and cite

For each mine, give:

- the short Korean sentence and a natural English gloss;
- the source title and a direct link;
- one or two useful words or grammar notes, including register or nuance;
- one short learner prompt or follow-up example.

Keep the response roughly 70% Korean and 30% English, with Korean examples always in Hangul and no romanization. Keep quoted material short and never reproduce a full article, transcript, or video script. Make clear when the source is written Korean rather than speech.

## Memory and state

Only propose a compact Supermemory record containing the sentence, source URL/title, useful vocabulary or grammar, date, and current state. Never store a full source or transcript. Memory writes remain approval-gated; do not claim a sentence was saved until the tool succeeds. An automatically generated digest does not by itself move an item from **Unseen** to **Learning**; record that transition only when the learner engages with or explicitly adopts it.
