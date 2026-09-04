---
name: sentence-mine
description: Mine short, natural Korean sentences from YouTube or Naver media for fresh lessons and daily digests.
---

# Korean sentence mining

Use this skill when the learner asks to find, fetch, or mine Korean examples from YouTube or Naver, or when a scheduled sentence digest runs.

## Source mode

- Prefer basic Korean caption or transcript lines from YouTube via `gemini_youtube_captions`.
- Ask for a short contiguous excerpt when possible: a target line plus one or two nearby lines from the same moment or exchange. Surrounding context is part of the mine, not optional decoration.
- Treat the result as a Gemini video transcript with approximate timestamps, not verified original-caption text or an audio transcription. Do not claim a caption is manual, auto-generated, or verbatim speech unless the source states that explicitly.
- Do not use a title, thumbnail, description, search snippet, or an inaccessible caption track as evidence of what was spoken.
- If `gemini_youtube_captions` returns `status: "unavailable"`, report that the video could not provide a usable basic Korean example and offer a Naver article as a separate written alternative when one is suitable.
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
3. For a YouTube result, call `gemini_youtube_captions` with the video URL; prefer adjacent lines from one nearby moment so the learner can see the exchange or discourse context. Use the returned lines only with the Gemini-derived label and approximate timestamp caveat. Never claim that its text is an exact caption-track quote.
4. For a Naver or other written-media result, use `web_fetch` only on a relevant, accessible article body. Do not download video or audio, bypass a login, paywall, robots rule, or region restriction, or scrape comments.
5. Prefer an accessible article body over a headline. Headlines and search snippets are discovery clues, not sentence examples.

## Select the mines

- Choose one to three contextual excerpts, not isolated sentences. Each excerpt should normally contain two to four short, consecutive lines (or a compact written sentence plus the surrounding clause) and one clearly marked target expression. Prefer enough context to resolve omitted subjects, pronouns, connective endings, and register. Keep the excerpt short; do not reproduce a transcript or article paragraph.
- Treat a single line as an exception only when it is genuinely self-contained. If the available source gives disconnected lines or no useful context, do not stitch them together or invent missing dialogue: try another fresh segment/source, or say that contextual mining was unavailable.
- Prefer everyday spoken style for YouTube; for Naver, choose natural contemporary written Korean and label it as written.
- Prefer natural contractions, sentence endings, and pragmatic nuance over isolated dictionary forms. Skip sensational, hateful, sexual, or otherwise distracting material unless the learner asks for it.
- Do not select a **Learning** or **Seen** item as the teaching target. Keep every selected mine **Unseen** until the learner adopts it.
- A daily digest should stay compact: normally one or two fresh **Unseen** mines. If no source provides a safe, verifiable example, say so instead of fabricating one.

## Teach and cite

For each mine, give:

- the short Korean context excerpt with the target expression clearly marked, plus a natural English gloss of the target in context;
- the source title and a direct link;
- one or two useful words or grammar notes, including register or nuance;
- one short learner prompt or follow-up example.

Keep the response roughly 70% Korean and 30% English, with Korean examples always in Hangul and no romanization. Keep quoted material short and never reproduce a full article, transcript, or video script. Make clear when the source is written Korean rather than speech.

## Memory and state

Write only a compact Supermemory record containing the sentence, source URL/title, useful vocabulary or grammar, date, and current state. Never store a full source or transcript. The private tutor's `add_memory` call is automatically approved; do not claim a sentence was saved until the tool succeeds. An automatically generated digest does not by itself move an item from **Unseen** to **Learning**; record that transition only when the learner engages with or explicitly adopts it.
