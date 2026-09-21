# Research story framework

The general research argument is:

```text
problem
  -> prior / competing methods
  -> weakness / unresolved gap
  -> our motivation
  -> high-level current approach
  -> current results
  -> current method
  -> current claims / novelty
  -> diagnostics supporting or challenging those claims
  -> current limitations / open questions
```

This is a menu, not a template. Adapt it to the current research stage and to
what changed since the audience last saw the work.

## Content standard (required)

> When present or explain anything, Our presentation must follow a very coherent structure that answer sequentially these question: Why we need to do this/The motivation? What are we going to do after having the requirement? Then explain what we do. You must explain very clear on what we are going to do, then present equation or proposition, theorem when we need clear formal formula to avoid vague, excessive wording. Then present experiment to support our claim if we had. The presentation must be very clear, concise, precise and connected as a complete, convincing story flow throughout the whole paper and each section, each subsection should have their own complete, convincing flow that become a perfectly fit part in the whole complete story flow of the paper. Every formula must be written in clear and easiest way to understand, all notation must be explained clearly before use. The presentation quality must be high, oral-standard, human-like with zero AI slop paragraph that throw to reader a bunch of words without truly saying anything meaningful. The complex mathematical theorem we introduce must be state clearly the message it is trying to deliver, no vague terms or jargon.

## Rules

- Do not force every section into every weekly deck.
- Do not invent a "our method" section during a survey.
- Do not restart from "problem definition" when the audience is familiar with it.
- End at limitations / open questions. The mentor discussion happens after the
  deck.
- Do not auto-generate Thank You, Q&A, generic next steps, or mentor feedback
  unless explicitly requested.

## Stage-adapted skeletons

### Early survey

```text
problem -> method landscape -> competitor A -> competitor B -> competitor C
  -> normalized comparison -> weaknesses / open gaps
```

No invented method. The output of the deck is the gap.

### Early method development

```text
minimal problem recap -> relevant competitor weakness -> motivation
  -> proposed method -> preliminary result -> uncertainty / diagnostic needed
```

### Mature weekly update

```text
this week's question -> 20-30 second project recap -> what changed in the method
  -> current method -> current results -> competitor + ours(previous) + ours(current)
  -> claim changes -> current diagnostics -> limitations / open questions
```

## One message per slide

Each slide carries exactly one intellectual message. Prefer question, claim, or
conclusion titles:

- good: "Does correction recover the future feature?"
- good: "Correction is nearly orthogonal to the desired direction"
- bad: "Feature Analysis"
- bad: "Results"

If a slide needs two conclusions, split it.
