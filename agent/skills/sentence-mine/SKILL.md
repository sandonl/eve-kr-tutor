---
name: sentence-mine
description: Mine short, natural Korean sentences from YouTube or Naver media for fresh lessons and daily digests.
---

# Korean sentence mining

Use this skill for an explicit request to find or mine Korean examples from YouTube or Naver, or a scheduled sentence digest. Discover fresh material; use `daily-lesson` to review stored Learning items.

## 1. Recall preferences and discover sources

- Start with one Supermemory `search_memory` query covering preferred YouTube/media sources and the saved 2k frequency-list preference. Supermemory supplies preferences and familiarity checks, never the sentences for this lesson. Ignore stored examples as content, and do not hardcode channel names or infer familiarity from following a channel.
- Discover videos yourself with Korean `web_search` queries. Do not ask the learner for links; use a supplied URL when they explicitly provide one. Try saved preferred sources in order before generic discovery, favouring YouTube for everyday dialogue and Naver/other written media as alternatives. If no preferences are available, choose an ordinary-life topic.
- Fetch source material during this run. Titles, thumbnails, descriptions, headlines, and search snippets are discovery clues, not evidence for a mined sentence.

## 2. Retrieve usable excerpts

- **YouTube:** call `youtube_video_excerpt` with the candidate URL for short, adjacent Korean on-screen dialogue-caption lines. Treat the result as model-read video text with approximate timestamps—not verified original-caption text or audio transcription. Do not display a Gemini/type label for video mines. Do not claim manual/automatic captions or verbatim speech without explicit source evidence. If unavailable, dubious, or just title cards/metadata, try another preferred video before moving to written alternatives.
- **Naver/other written media:** use `web_fetch` on an accessible article body, and label the result as written Korean, not speech. For Naver discovery, restrict searches to a relevant domain such as `news.naver.com`, `entertain.naver.com`, or `tv.naver.com`.
- Select two to four short consecutive lines, or a compact written sentence with its surrounding clause, so omitted subjects, endings, and register make sense. A single line is acceptable only if self-contained. Never stitch disconnected lines together or invent missing dialogue.
- Preserve selected lines in full: no shortening, added ellipses, or silent paraphrases. Reject truncated lines unless adjacent lines complete the thought. Reject romanized/transliterated lines rather than converting them; Korean examples must remain readable Hangul.
- Prefer conversational contractions, endings, and pragmatic nuance. Skip sensational, hateful, sexual, or distracting material unless requested. Keep excerpts short; never reproduce full transcripts, scripts, article paragraphs, or sources. Do not download audio/video, transcribe audio, scrape comments, or bypass login, paywall, robots, or regional restrictions.

## 3. Choose unfamiliar targets

- Identify two or three candidate expressions per excerpt, then name them in a narrow Supermemory query checking 2k-list membership and **Learning**/**Seen** states. Use `EVE_KOREAN_LEARNING_PILE` for current Learning-state checks; do not request or display stored lesson content.
- Choose one useful **Unseen** target outside the remembered 2k baseline. Familiar language may remain in the surrounding excerpt, but cannot be the teaching target. If all candidates are familiar, try another segment/source instead of teaching a familiar word simply because it is available.
- If the list or state lookup is unavailable, continue without asking for confirmation. Choose a less-basic, source-specific expression and label it as a candidate, not confirmed new vocabulary. The preference is a soft filter, not a blocking approval step.
- Collect **3–5 distinct mines before presenting the result**; do not stop after the first usable excerpt. Each mine has its own source excerpt and target expression: surrounding lines and the tutor-created example do not count as extra mines. Try additional preferred sources if necessary, and non-preferred sources only after preferred options are exhausted. If those attempts leave fewer than three safe candidates, return those with a brief source-limitation note; if none remain, say mining was unavailable. Never fill gaps with stored material or fabricated examples.

## 4. Present the mines

Start directly with the learner-facing result, not planning, instructions, tool commentary, or a draft. Use roughly 70% Korean and 30% English, with no romanization. Use plain-text numbered blocks, no Markdown decoration, and no practice-prompt field.

The template below shows the minimum complete batch: **three numbered mines**, not a single block to send on its own. Add blocks `4)` and `5)` in the same format when additional usable mines are available. Mines may come from the same video or different sources. Fill every placeholder from the retrieved source, except the clearly tutor-created example. Keep the Korean excerpt on its own lines and explain the target with one or two brief meaning, grammar, or register notes.

```text
오늘의 문장

1) 출처: [source title]
출처 링크: [exact direct https:// URL used]
시간: [approximate timestamp; omit for written sources]
맥락: [short Korean explanation of the situation]
[complete Korean context line]
[complete Korean context line]

핵심 표현: [target expression]
뜻: [concise English meaning in context]
뉘앙스: [short Korean/English nuance or register note]
예문: [one natural tutor-created Korean example]

2) 출처: [source title]
출처 링크: [exact direct https:// URL used]
시간: [approximate timestamp; omit for written sources]
맥락: [short Korean explanation of the situation]
[complete Korean context line from the second excerpt]
[complete Korean context line from the second excerpt]

핵심 표현: [second target expression]
뜻: [concise English meaning in context]
뉘앙스: [short Korean/English nuance or register note]
예문: [one natural tutor-created Korean example]

3) 출처: [source title]
출처 링크: [exact direct https:// URL used]
시간: [approximate timestamp; omit for written sources]
맥락: [short Korean explanation of the situation]
[complete Korean context line from the third excerpt]
[complete Korean context line from the third excerpt]

핵심 표현: [third target expression]
뜻: [concise English meaning in context]
뉘앙스: [short Korean/English nuance or register note]
예문: [one natural tutor-created Korean example]
```

Before sending, count the numbered blocks: there must be 3–5, unless the source-limitation exception above applies. Check that every mine has its own direct `https://` source URL on the `출처 링크:` line, matching the video inspected or article fetched, and that no placeholders remain. A title or timestamp cannot replace the link: discard unlinked mines. If space is tight, shorten explanations or reduce five mines to three; do not cut source lines or silently collapse the batch to one mine.

## 5. Save compact memories

Save only the short sentence/context, source URL/title, useful vocabulary or grammar, date, and current state. Keep discoveries **Unseen** until the learner engages with or adopts them; receiving a digest alone is not adoption.

When an item becomes **Learning**, update the canonical `EVE_KOREAN_LEARNING_PILE` using the system's memory-update procedure, not a separate Learning-item record. `add_memory` is automatically approved for this private tutor, but only claim a save after the tool succeeds. Never store a full source or transcript.
