# Hana's Birthday Slideshow/Mini-Game Gift

## Context

This is a personal birthday gift website for Hana, built by Seonho. The project started as a simple scrolling "letter + photo gallery" page (current `index.html`/`style.css`), but that approach has been scrapped in favor of something far more memorable: a 7-screen interactive slideshow/mini-game experience that walks Hana through a "choose the right person" joke, two mini-games tied to real shared memories (eating together, texting each other), and a final heartfelt tribute. The goal is for this to feel like the best birthday gift — polished, personal, and fun to actually play through, not just read.

All photos (Celine, Seonho, Hana eating, texting screenshot, final photo) and most note/message text are **not yet provided** — the user will supply them later. The plan must make these trivially easy to drop in afterward without touching code.

No backend, no build tooling. Must work by simply double-clicking `index.html` (so classic `<script>` tags, not ES modules — module imports are blocked by CORS on `file://`).

## Carry forward from the existing site

From current `index.html` / `style.css`:
- Color tokens: `--cream #fdf6ec`, `--paper #fffaf2`, `--blush #f4b8a8`, `--terracotta #d97b5f`, `--brown #6b4f3f`, `--ink #4a3a30`, `--tape #f6e8c8`. Keep these; add 2 new tokens for game feedback (muted olive success, deeper warm error) rather than introducing a clashing neon palette.
- Fonts: Caveat (cursive — emotional/handwritten: titles, notes, signatures) + Quicksand (body/UI) — same Google Fonts `<link>` tags, reused verbatim.
- Polaroid placeholder gradient (`linear-gradient(135deg, #f4dccb, #f4b8a8)` on `img`) — reuse as the universal "photo coming soon" fallback for every image slot in the new build.
- Tape/washi `::before` accent and per-card `rotate()` hand-placed feel — reuse on note cards and photo reveals.
- Dot-pattern `.confetti` background — extend into a reusable particle-burst helper for the start screen and success moments.

## File structure (new)

- `index.html` — rebuilt: 7 sibling `<section data-screen="...">` elements inside `main#app`
- `style.css` — extended with screen-manager transition CSS + new screen layouts
- `content.js` — **the one file the user edits later**: every piece of copy, every image path, the burger count, the 5 typing sentences (final, given verbatim), placeholder note/message text wrapped in `[[ ]]` markers so unfinished fields are obvious
- `effects.js` — shared helpers: particle burst, shake animation, sound toggle/play (muted by default, persisted in localStorage)
- `app.js` — screen manager: `showScreen(id)`, enter/exit fade+slide transitions, a cleanup registry that tears down any screen's global listeners the moment the user navigates away
- `game-eating.js` — Memory #1 mini-game
- `game-typing.js` — Memory #2 mini-game
- `images/celine.jpg`, `images/seonho.jpg`, `images/girl-sprite.png`, `images/burger.png`, `images/hana-eating-full.jpg`, `images/texting.jpg`, `images/final.jpg` — placeholder slots, all using the gradient-fallback `onerror` pattern so missing files never show a broken-image icon
- `sounds/` (optional, all muted by default) — click, wrong, correct, collect, send

Script load order in `index.html`: `content.js` → `effects.js` → `app.js` → `game-eating.js` → `game-typing.js`.

## Screen-manager architecture (`app.js`)

All 7 screens exist as permanent DOM siblings, toggled via a `data-active` attribute (no templating/innerHTML churn for structure):

1. `start` — splash/cover
2. `choose` — "choose the better person"
3. `game-eating` — Memory #1 mini-game
4. `memory-note-1` — Memory #1 reveal photo + note
5. `game-typing` — Memory #2 mini-game
6. `memory-note-2` — Memory #2 photo + note (two-column)
7. `final` — closing screen

`showScreen(id)` runs the outgoing screen's registered cleanup (if any), toggles `data-active`, plays fade+slide CSS transitions. A centralized cleanup registry guarantees the eating game's keydown/keyup movement listeners and the typing game's Enter-to-send listener are **never simultaneously attached** — this is structural, not per-screen guesswork.

## Screen-by-screen design

**1. Start** — animated panning gradient background (cream/blush/terracotta), two-layer drifting dot-particle effect, Caveat title + Quicksand subtitle, a glow-pulsing "Press Start" button. Click → particle burst → advance.

**2. Choose** — two focusable card-buttons (Celine / Seonho), each a placeholder photo + name. **Celine** (wrong): never navigates; shakes the card, shows the next message from a rotating array of "wrong" lines in `content.js`, optional wrong-SFX — clickable indefinitely. **Seonho** (correct): success scale-pulse + glow, optional correct-SFX, short delay, then advance.

**3a. Eating mini-game** (`game-eating.js`) — bounded field; player sprite moved via **arrow keys + WASD**, held-key state read every `requestAnimationFrame` tick, diagonal speed normalized, clamped to field bounds. Burgers spawn at randomized, non-overlapping positions. Distance-based collision detection per frame removes a collected burger with a pop-fade. **Reveal mechanic: shuffled mosaic tile grid** sized from `burgerCount` (e.g. 12 burgers → 4×3 grid) layered over the target photo; each collected burger fades the next shuffled tile to transparent. On full reveal, a "Next" button fades in. Touch devices get an on-screen 4-direction D-pad that sets the same directional flags the keyboard uses — zero changes needed to the movement loop itself.

**3b. Memory #1 note** — revealed photo + handwritten-style note card (paper/tape/rotation treatment), text from `content.js` (placeholder for now), "Continue" button.

**4a. Typing mini-game** (`game-typing.js`) — MonkeyType-style: current target sentence shown as individual character spans with live correct/incorrect coloring as the user types into a real `<input>` (keeps mobile keyboard + accessibility free). Enter key checks an exact, trimmed match against the current sentence; mismatch shakes the input and blocks advance; match appends a right-aligned, fade+slide-in chat bubble to an auto-scrolling thread and loads the next sentence. Sentences, in order, exactly as given:
1. "Seonho Kim is the best person in the world"
2. "I Hana Song will always be someone that Seonho Kim could look up to"
3. "I Hana Song will always be on the gospel journey with Seonho Kim"
4. "I Hana Song will always be there for Seonho Kim and guide him in the right path"
5. "I Hana Song will always proclaim Jesus Christ to Seonho Kim who will need it in times of need"
Visual treatment stays a clean, standard messaging-app look (no added faith iconography, per user preference). After sentence 5 sends, advance to the note screen.

**4b. Memory #2 note** — two-column on desktop (texting photo | note card), stacks on mobile. Photo uses the existing polaroid frame; note reuses the paper/Caveat treatment. Placeholder text in `content.js`. "Continue" button.

**5. Final** — the emotional payoff: generous whitespace, elegant (non-scrapbook) photo frame, the long closing message split into paragraphs by blank lines in `content.js` (placeholder for now), larger/more spaced body type, Caveat signoff line, a gentle continuous particle flourish.

## Placeholder/fallback strategy

One shared CSS class (gradient background + centered "photo coming soon" label) applied via `onerror` swap on every `<img>` slot — never a broken-image icon. Sprite/burger get simpler fallbacks (soft circle / emoji-in-a-div) so the eating game still looks fine with zero real assets.

## Mobile/responsive

Keyboard-first, with touch as a safety net (per user preference): on-screen D-pad overlay for the eating game only, shown when a touch-capable viewport is detected, reusing the same directional state the keyboard sets. The typing game needs no special handling — it's a real input. Extend the existing `clamp()`-based type scaling and ~480px/700px breakpoints (card stacking, two-column→one-column notes) across all new screens.

## Polish

- Particle-burst helper (CSS-custom-property-driven keyframe, self-removing elements) used on: start idle background, choose correct-answer moment, both game completions, final screen ambient flourish.
- Sound: **on**, muted-by-default with a persistent (localStorage) mute/unmute toggle fixed in a corner across all screens; sound helper fails silently if a clip file is missing.
- Caveat reserved for emotional moments, Quicksand for all functional UI — kept as an explicit rule across every new screen.
- Two new color tokens (muted olive success, deeper warm error) added alongside, not replacing, the existing 7-token palette.

## Build order

1. `index.html` 7-screen skeleton + `content.js` with all placeholder text/paths.
2. `app.js` screen manager + CSS transitions — validate navigation end-to-end with placeholder buttons before any game logic.
3. Start + Choose screens (CSS-heavy, light JS — good warm-up).
4. `game-eating.js`: movement loop → spawning/collision → mosaic reveal → note screen.
5. `game-typing.js`: validation/diff rendering → chat-bubble accumulation across all 5 sentences → note screen.
6. Final screen typography polish.
7. `effects.js` polish pass (particles, shake, sound toggle) + eating-game touch D-pad.
8. Responsive QA at 480px / 700px / desktop.

## Verification

- Open `index.html` directly via double-click (file://) in Chrome/Edge and confirm all 7 screens are reachable in order with no console errors — this is the critical real-world usage path since Hana will likely just open the file or a shared link to it.
- Click "Celine" repeatedly on the choose screen and confirm it never advances and rotates through wrong messages; click "Seonho" and confirm it advances.
- Play the eating game with both arrow keys and WASD, confirm diagonal movement isn't faster, confirm all burgers are collectible and the mosaic fully reveals, confirm the "Next" button only appears after full reveal.
- Type each of the 5 sentences (including deliberately making a typo first) in the typing game, confirm live character coloring, confirm Enter only advances on an exact match, confirm chat bubbles accumulate and auto-scroll correctly.
- Resize the browser to ~375px (phone), ~700px (tablet), and full desktop width and check every screen for layout breakage.
- Temporarily rename/remove an image file to confirm the `onerror` placeholder shows cleanly instead of a broken-image icon.
- Toggle sound mute/unmute and confirm the preference persists across a page reload.
