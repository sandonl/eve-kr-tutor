---
name: sentence-mine
description: Mine short, natural Korean sentences from YouTube or Naver media for fresh lessons and daily digests.
---

# Korean sentence mining

Use this skill when the learner asks to find, fetch, or mine Korean examples from YouTube or Naver, or when a scheduled sentence digest runs.

## Source mode

- Prefer spoken Korean from YouTube when `youtube_transcript` returns `status: "ok"` with non-empty timestamped segments.
- Treat the result as caption evidence, not an audio transcription or proof that captions were manually written. Do not claim a caption is manual, auto-generated, or verbatim speech unless the source states that explicitly.
- Do not use a title, thumbnail, description, search snippet, or an inaccessible caption track as evidence of what was spoken.
- If `youtube_transcript` returns `status: "unavailable"`, report that the video could not provide a verifiable spoken example. Keep the video as a candidate if useful, and offer a Naver article as a separate written alternative when one is suitable.
- Naver and other written media are valid sentence-mining sources. Label every example as written Korean, not spoken dialogue, and never imply that an article sentence came from the video's speech.

## Preferred sources

- At the start of every mining run, use Supermemory's `search_memory` with a source-preference query to retrieve the learner's preferred YouTube and media source list. Use only records about source preferences; ignore any stored words, sentences, or grammar returned alongside them. Do not rely on hardcoded names or the current prompt alone.
- Treat the learner's saved preferred-source list as an ordered first choice. Try those sources before generic discovery.
- Prefer preferred YouTube sources with verified captions for spoken examples. Preferred Naver or other media sources remain available as written alternatives.
- If a preferred source has no accessible, verifiable material, move to the next one. Use a non-preferred fallback only after the preferred list is exhausted, and say whether the selected source is spoken or written.
- Keep source preferences separate from language-item states: preferring a channel does not mean the learner has seen any sentence, word, or grammar from it.

## Fresh-source rule

- Supermemory is a preference and state filter, not the content feed. Do not query it for stored sentence content or Learning examples, and do not copy any such records into the response.
- Every mine must come from a new, verifiable page fetched during this run. Do not re-elicit or review a stored Learning item through this skill.
- After extracting a fresh candidate, use only the candidate's state metadata to reject duplicate targets: selected teaching targets must be **Unseen**. Familiar language may occur incidentally in a source sentence, but it is not a mine unless the target itself is Unseen. Never surface the stored record used for the check.
- If the preferred sources produce no new candidate, say so instead of filling the response with stored material.

## Find usable source material

1. Do not recall stored Learning material. Use the Supermemory lookup above for source preferences, and use only narrow state metadata checks after finding a fresh candidate.
2. Search in Korean with `web_search`, restricting results to YouTube or a specific Naver media domain such as `news.naver.com`, `entertain.naver.com`, or `tv.naver.com`. Prefer a channel or publication the learner already follows; otherwise choose a current, ordinary-life topic.
3. For a YouTube result, call `youtube_transcript` with the video URL. Use only a successful result's timestamped segments; include the returned video URL and the segment start time when citing a mine.
4. For a Naver or other written-media result, use `web_fetch` only on a relevant, accessible article body. Do not download video or audio, bypass a login, paywall, robots rule, or region restriction, or scrape comments.
5. Prefer an accessible article body over a headline. Headlines and search snippets are discovery clues, not sentence examples.

## Select the mines

- Choose one to three short examples with enough context to understand and a useful expression or grammar pattern. Prefer everyday spoken style for YouTube; for Naver, choose natural contemporary written Korean and label it as written.
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
