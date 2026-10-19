# Building a Personal Language Tutor

I’m building a Korean tutor that I can message on Telegram. It finds expressions from Korean content, explains them, and remembers what I want to practise.

*[Add a bit about your Korean learning so far and why you started this project.]*

## The idea

The approach takes inspiration from Refold and Migaku: learn through content you’re interested in, pick out useful language, and revisit it.

I wanted an agent to help with that process. Find something worth studying, explain it in context, and keep track of it for next time.

## Putting it together

The main pieces are:

- **Eve** runs the agent, tools, and scheduled lessons.
- **Gemini** handles responses through Vercel AI Gateway.
- **Supermemory** stores learning context between conversations.
- **Telegram** is where I talk to it.
- **Vercel** hosts it.

The tutor’s behaviour lives in a Markdown file. It includes preferences like using natural spoken Korean, skipping romanisation, and keeping corrections short. The default is mostly Korean, with English for explanations.

Two skills handle the main workflows: finding new expressions and reviewing existing ones. Each skill gives the agent instructions for the task; tools let it search, inspect videos, and access memory.

*[Add why you chose Eve and a small code example.]*

## Remembering what I’m learning

The tutor keeps one learning list with three states:

- **Unseen:** something it’s found that I haven’t started studying.
- **Learning:** something I want more practice with.
- **Seen:** something I recognise and don’t need recommended.

“Seen” leaves room for forgetting. I can ask to move an expression back into Learning, and one correct answer doesn’t automatically take it out.

Each item gets a permanent number, so I can refer to it without copying the expression.

These updates currently depend on the model following instructions. That’s a limitation I’ll need to watch as the list grows.

## Finding expressions

When I send `/mine`, the tutor searches for material based on my saved preferences. It looks for a short excerpt, chooses an expression, and explains it with a source link and another example.

For YouTube, a tool asks Gemini to read Korean captions visible in the video. Those excerpts aren’t verified transcripts. If it can’t get usable text, it’s instructed to try another source.

It also records which videos it has suggested to help avoid repeats.

*[Show one actual result here.]*

## Daily practice

`/lesson` starts a review of my Learning items. A daily schedule can also send up to ten items to Telegram, with examples and a short practice question.

The review uses what’s already in the list. Finding new material is a separate request, so I can keep practising something without constantly adding more.

## What I still need to find out

The project has tests for tool behaviour and message delivery, plus evaluations that exercise the agent.

The bigger question needs actual use: does it find expressions worth learning, keep the list accurate, and give me practice I’ll stick with?

*[Add what’s worked so far, one frustrating interaction, and what you want to fix next.]*
