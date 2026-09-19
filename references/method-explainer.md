# Explaining a method

When explaining a competitor or our own method, reason through these questions
internally before drawing:

1. What problem does it solve?
2. What observation enables it?
3. What changes relative to the obvious baseline?
4. What enters the new operation or module?
5. What operation occurs?
6. What leaves it?
7. Why should it work?
8. What assumption does it depend on?
9. Where can that assumption fail?
10. How does that relate to our method?

## Preferred structure: three stages

```text
A. intuition          B. mechanism                  C. limitation / relevance
```

- **A. Intuition** — the idea in one sentence, no equations.
- **B. Mechanism** — a small pipeline drawn in the shared visual grammar
  (input -> module -> output). Never start from a huge architecture screenshot.
- **C. Limitation / relevance** — the assumption it depends on, where it can
  fail, and how it relates to us.

## Redraw, do not paste

Redraw competitor concepts into the common visual language. Do not paste complex
paper architecture figures unless exact reproduction is scientifically
necessary. Use the same shapes and arrows for every method so the audience can
compare mechanisms at a glance.

## Normalize comparisons

Bad:

```text
Paper A's original figure | Paper B screenshot | our custom diagram
```

Good:

```text
Method A    input -> reuse     -> output
Method B    input -> predictor -> output
Our method  input -> correction-> output
```
