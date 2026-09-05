---
name: sentence-mine
description: Mine short, natural Korean sentences from YouTube or Naver media for fresh lessons and daily digests.
---

# Korean sentence mining

Use this skill when the learner asks to find, fetch, or mine Korean examples from YouTube or Naver, or when a scheduled sentence digest runs.

## Source mode

- Prefer short Korean on-screen caption excerpts from YouTube via `youtube_video_excerpt`.
- Request a short contiguous excerpt when possible: a target line plus one or two nearby lines from the same moment or exchange. Surrounding context is part of the mine, not optional decoration.
- Treat the result as a Gemini video excerpt with approximate timestamps, not verified original-caption text or an audio transcription. Do not claim a line is manual, auto-generated, or verbatim speech unless the source states that explicitly.
- Preserve Korean in Hangul only. Never generate, add, or repeat romanization/transliteration, pronunciation spellings, or parenthetical Latin-letter readings; if a returned line is romanized or mixed-script rather than readable Hangul, discard it and find another line.
- Do not use a title, thumbnail, description, search snippet, or an inaccessible caption track as evidence of what was spoken.
- If `youtube_video_excerpt` returns `status: "unavailable"`, move to the next preferred video before offering a Naver article as a separate written alternative. If the returned lines look like title cards, labels, or metadata rather than dialogue captions, discard them and try another preferred video.
- Naver and other written media are valid sentence-mining sources. Label every example as written Korean, not spoken dialogue, and never imply that an article sentence came from the video's speech.

## Preferred sources

- At the start of every mining run, use Supermemory's `search_memory` with one query covering the learner's preferred YouTube/media sources and saved 2k frequency-list preference. Use source-preference records for discovery and the frequency-list record only as a familiarity filter; ignore stored sentences, examples, and other language material as lesson content. Do not rely on hardcoded names or the current prompt alone.
- Treat the learner's saved 2k frequency list as a standing familiarity preference. This is a soft filter, not an approval gate: never ask the learner to confirm the list or wait for it before discovering source material.
- Treat the learner's saved preferred-source list as an ordered first choice. Try those sources before generic discovery.
- Prefer preferred YouTube sources with accessible on-screen captions for spoken examples. Preferred Naver or other media sources remain available as written alternatives.
- If a preferred source has no accessible, verifiable material, move to the next one. Use a non-preferred fallback only after the preferred list is exhausted, and say whether the selected source is spoken or written.
- Do not ask the learner for a YouTube link as the first step. Discover a fresh video yourself from the saved preferred-source list; use a learner-supplied URL only when they explicitly provide one.
- Keep source preferences separate from language-item states: preferring a channel does not mean the learner has seen any sentence, word, or grammar from it.

## Fresh-source rule

- Supermemory is a preference and state filter, not the content feed. Do not query it for stored sentence content or Learning examples, and do not copy any such records into the response.
- Every mine must come from a new, verifiable page fetched during this run. Do not re-elicit or review a stored Learning item through this skill.
- After extracting a fresh candidate, use the candidate's 2k-list membership and state metadata to reject familiar targets: a target on the learner's 2k list or marked **Learning**/**Seen** is not a new mine. Familiar language may occur incidentally in a source sentence, but it is not a mine unless the target itself is both outside the remembered list and **Unseen**. Never surface the stored record used for the check.
- Make that a narrow candidate check: name the two or three Korean expressions you are considering in the Supermemory query and ask whether each is in the 2k baseline or has a **Learning**/**Seen** state. Use the canonical `EVE_KOREAN_LEARNING_PILE` record for current Learning-state checks. Do not issue a broad request for stored lesson content.
- If the 2k list or state lookup is unavailable, continue the run without blocking. Do not claim that the target is outside the list; prefer a less-basic, source-specific expression and present it as a candidate rather than as confirmed new vocabulary.
- If the preferred sources produce no new candidate, say so instead of filling the response with stored material.

## Find usable source material

1. Do not recall stored Learning material as lesson content. Use the Supermemory lookup above for source preferences and the 2k familiarity preference, then use only narrow candidate checks after finding a fresh excerpt.
2. Search in Korean with `web_search`, restricting results to YouTube or a specific Naver media domain such as `news.naver.com`, `entertain.naver.com`, or `tv.naver.com`. Prefer a channel or publication the learner already follows; otherwise choose a current, ordinary-life topic.
3. For a YouTube result, call `youtube_video_excerpt` with the video URL; prefer adjacent lines from one nearby moment so the learner can see the exchange or discourse context. Use the returned lines only with the Gemini-derived label and approximate timestamp caveat. Never claim that its text is an exact caption-track quote or audio transcription.
4. For a Naver or other written-media result, use `web_fetch` only on a relevant, accessible article body. Do not download video or audio, bypass a login, paywall, robots rule, or region restriction, or scrape comments.
5. Prefer an accessible article body over a headline. Headlines and search snippets are discovery clues, not sentence examples.

## Select the mines

- Choose one to three contextual excerpts, not isolated sentences. Each excerpt should normally contain two to four short, consecutive lines (or a compact written sentence plus the surrounding clause) and one clearly marked target expression. Prefer enough context to resolve omitted subjects, pronouns, connective endings, and register. Keep the excerpt short; do not reproduce a transcript or article paragraph.
- Identify two or three plausible target expressions from each fresh excerpt before choosing one. Check each against the remembered 2k list and language-item state, then choose the first useful target that is outside the list and **Unseen**. This prevents a familiar verb such as “to improve” or “to increase” from consuming the mine when the same source contains a better new expression.
- If every plausible target is familiar, mine another fresh segment or video. Do not return the familiar target just because it is available, and do not ask the learner to provide another link.
- Treat a single line as an exception only when it is genuinely self-contained. If the available source gives disconnected lines or no useful context, do not stitch them together or invent missing dialogue: try another fresh segment/source, or say that contextual mining was unavailable.
- Preserve every selected source line in full. Do not shorten it, add `...` or `…`, or silently replace it with a paraphrase. If a returned line is already truncated or ends with an ellipsis, treat it as unusable unless the adjacent lines complete the thought; choose another segment instead.
- Prefer everyday spoken style for YouTube; for Naver, choose natural contemporary written Korean and label it as written.
- Prefer natural contractions, sentence endings, and pragmatic nuance over isolated dictionary forms. Skip sensational, hateful, sexual, or otherwise distracting material unless the learner asks for it.
- Do not select a target on the remembered 2k frequency list or a **Learning**/**Seen** item as the teaching target. Keep every selected mine **Unseen** until the learner adopts it.
- A daily digest should stay compact: normally one or two fresh **Unseen** mines. If no source provides a safe, verifiable example, say so instead of fabricating one.

## Teach and cite

Every mine must include a direct source URL. This is mandatory: a source title, channel name, timestamp, or search result is not a substitute for the link.

The response is the final learner-facing message. Do not expose planning or process: never mention the skill, system instructions, tools, constraints, formatting decisions, or a draft. Do not start with phrases such as `Let's format...`, `Draft:`, `Following the constraints...`, or `I'll present...`; start directly with the mine or a concise unavailable result.

For each mine, give:

- the complete Korean context excerpt, followed by a separate `핵심 표현:` label and a natural English gloss of that expression in context;
- the source title and the exact direct URL used for the source (the YouTube video URL passed to `youtube_video_excerpt`, or the Naver/article URL fetched with `web_fetch`);
- one or two useful words or grammar notes, including register or nuance;
- one short learner prompt or follow-up example.

Put the URL on its own plain-text line labelled `출처 링크:` so it remains clickable in Telegram and the TUI. Before sending, verify that every numbered mine has an `https://` URL matching its source. If the exact reference URL is unavailable, discard that mine and find another source or say that mining was unavailable; never present an unlinked mine.

Keep the response roughly 70% Korean and 30% English, with Korean examples always in Hangul and no romanization. English glosses explain meaning; they never contain a Korean pronunciation spelling. Use plain text that renders reliably in Telegram and the TUI: short labels and numbered items are fine, but avoid Markdown headings (`#`), blockquotes (`>`), horizontal rules (`---`), tables, nested lists, and decorative bold or italics. Do not cut a source excerpt to make it fit; return fewer mines instead. Keep quoted material short and never reproduce a full article, transcript, or video script. Make clear when the source is written Korean rather than speech.

Use a compact layout such as: `오늘의 문장`, `1) 출처:`, `출처 링크:`, `시간:`, `맥락:`, `핵심 표현:`, `뜻:`, `예문:`, and `연습:`. Keep the Korean excerpt on its own lines so the surrounding exchange remains readable. Identify the target expression with the label rather than changing the source wording with Markdown markers.

## Memory and state

Write only a compact Supermemory record containing the sentence, source URL/title, useful vocabulary or grammar, date, and current state. Never store a full source or transcript. If the learner explicitly adopts a mined item as **Learning**, update the canonical `EVE_KOREAN_LEARNING_PILE` record instead of creating a separate Learning-item memory. The private tutor's `add_memory` call is automatically approved; do not claim a sentence was saved until the tool succeeds. An automatically generated digest does not by itself move an item from **Unseen** to **Learning**; record that transition only when the learner engages with or explicitly adopts it.
