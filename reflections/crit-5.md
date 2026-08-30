# Crit 5 reflection

**What was the breakthrough that moved the work forward?**

The core mechanic — planets with local gravity you jump between — sat there
"working" for most of the build: types checked, the one required test
(`gravityAt` favouring the dominant planet) stayed green, the opening frame
looked right. But playing it in a real browser, a single jump sent the player
sailing off the top of the canvas in a dead straight line. The breakthrough
wasn't a code fix, it was doing the arithmetic by hand: at a typical in-flight
distance, `mass=1400` over squared pixel-distance worked out to about
0.015 px/s² of pull against a 160+ px/s jump — three orders of magnitude too
weak to ever curve anything back. No amount of staring at the canvas would
have found that; it took converting "feels wrong" into a number. Once gravity
was rescaled against each planet's own radius instead of raw pixels, and
speeds retuned to match, a Playwright playtest showed the exact trajectory I'd
wanted the whole time: an arc over one planet, capture by another, a landing.

**What did this change about who I want to be as a software developer?**

It's a concrete argument against trusting green checks as proof a feature
*works*, only that it doesn't crash. `pnpm check` stayed green through the
entire period the game was unplayable, because nothing in it exercised feel —
only shape. The habit I want to keep is the one this forced: when a test suite
agrees with code that's visibly broken, the suite is answering the wrong
question, and the fix is to go look at the thing running, not to trust the
suite harder.
