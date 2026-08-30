# Process overview

**Gravity Hop**: a 2D side-view world of small planets, each with its own
local gravity. Walk a planet's curved surface, jump, get pulled toward
whichever planet dominates mid-air, land on the gold goal planet to win or
drift past the world's edge to lose. Single static screen, no camera, no
on-screen or off-screen instructions — the mechanic and the ending are meant
to read from the shapes and colours alone.

## The moments that mattered

1. **Picking the one mechanic, deliberately narrow.** The brief only fixes
   "one focused mechanic"; the shape of it was mine to choose. I turned down
   plane-shifting, rag-doll physics and grab-swing (all offered as options)
   for planets-with-gravity, and then cut a scrolling camera in favour of a
   static single screen specifically to keep a one-week prototype from
   spending its budget on a camera subsystem instead of the gravity feel
   itself. That scope call is why the whole prototype is one screen wide.
   [`5391401`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-ryschneider/commit/5391401)

2. **Architecture chosen to make the one required test possible, not
   bolted on after.** The spec asks for one game rule under a focused
   automated test. Rather than write the game as a single canvas+rAF blob
   and then dig a test out of it, gravity/landing/win-loss logic went into
   `physics.ts`/`rules.ts` with zero DOM dependency from the start, so
   `spec/crit-5.test.ts` imports `gravityAt` directly and asserts the
   sum-of-pulls rule with no browser involved.
   [`5391401`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-ryschneider/commit/5391401)

3. **A green suite hid a genuinely broken game.** Typecheck, build and the
   gravity test all stayed green while the game was, in practice, unplayable
   — a single jump sent the player off the top of the canvas in a straight
   line, because gravity was scaled directly against raw pixel distance
   (`mass / rawDistance²`), which worked out to roughly 0.015 px/s² of pull
   at real gameplay distances against 160+ px/s jump speeds. Nothing in
   `pnpm check` exercises *feel*, only shape, so I only found this by driving
   a headless Chromium against the running dev server and watching the
   trajectory across several screenshots. The fix was rescaling gravity by
   each planet's own radius rather than absolute pixels, and retuning
   move/jump speed to match; re-running the same playtest afterwards showed
   the jump now arcing over one planet and being captured by the next,
   landing on the goal planet for a confirmed win and, on a jump aimed away
   from every planet, drifting past the world bounds for a confirmed loss.
   [`5391401`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-ryschneider/commit/5391401)

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
