# hummachine

A playable synth **NFT** built from human humming — *human · machine*.

The whole instrument compiles to a **single self-contained `index.html`** (JS, CSS,
and your hum samples all base64-inlined) so it can be minted as an HTML /
`animation_url` token on **Manifold** and listed on **SuperRare**. No servers, no
external links, nothing to rot — the token *is* the synth.

## What it does

- **A patchable modular rack.** Eight Eurorack-style modules — VOICES · LFO ·
  FILTER · DRIVE · DELAY · REVERB · VCA · OUTPUT — with real jacks. **Drag virtual
  patch cables** between them to rewire audio *and* CV routing live; grab a
  patched input to repatch it.
- **Auto-plays** on open: a slow, evolving wash of held hums and phrases.
- **Take over any time** — the moment you play a note, it hands you control.
- **Polyphonic** sampler: play chords; all voices flow through the patched chain.
- Three ways to play, all live at once:
  - on-screen keyboard (mouse + multitouch)
  - computer keyboard (Ableton-style: `z s x d c…`, two rows, arrows shift octave)
  - **Web MIDI** — plug in a controller and play it with your hands
- An **oscilloscope** on the OUTPUT module + a spectrum on the LED browser.
- Built from **your voice**: drop hums in `src/samples/` and they become the instrument.

## Modules & patching

Default cabling: `VOICES → FILTER → DRIVE → DELAY → REVERB → VCA → OUTPUT`, with
the `LFO → FILTER` CV sweep. Drag from any jack to a compatible one (audio↔audio,
CV↔CV, output↔input) to rewire. Each knob and every cable is captured when you
**SAVE** a patch, and restored when you browse presets.

Until you add recordings, it runs on procedurally-generated placeholder hum tones,
so it's fully playable today.

## Add your humming

See [`src/samples/README.md`](src/samples/README.md). Short version: drop files named
`note_C3.mp3`, `note_F#4.ogg`, `phrase_01.mp3`, … into `src/samples/`. They're
auto-detected, pitch-mapped, and inlined at build time. Prefer compressed
`.mp3`/`.ogg` to keep the token thin.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 — play it in the browser
```

## Build the NFT file

```bash
npm run build    # → dist/index.html  (one self-contained file)
```

Upload `dist/index.html` to Manifold as the artwork (HTML), then mint and list on
SuperRare as you normally would.

## Stack

React + Vite + vanilla CSS, Web Audio API, Web MIDI API. `vite-plugin-singlefile`
inlines everything into one file; a very high `assetsInlineLimit` forces the audio
to embed as base64.

## Layout

```
src/
  audio/
    engine.js      conductor: AudioContext, sampler, inputs, takeover
    modules.js     rack spec: modules, jacks, params, default cabling (drives UI + audio)
    modular.js     modular audio graph: builds module nodes, connects/removes cables
    fx.js          reverb impulse + drive curve generators
    sampler.js     polyphonic multisampler (nearest-sample pitch shifting + ADSR)
    samples.js     auto-loads src/samples/*, else procedural fallback
    procedural.js  synthesized placeholder hum + phrase buffers
    autoplay.js    generative auto-player (lookahead scheduler)
    patches.js     factory presets + user patches (params + cables) in localStorage
    midi.js        Web MIDI input
    keyboard.js    computer-keyboard input
    theory.js      note-name ↔ MIDI, scales
  components/
    Rack.jsx       module layout + draggable patch-cable layer (SVG)
    Module.jsx     one module: title, knobs, jacks
    Knob.jsx       rotary knob (drag / scroll / double-click reset)
    Scope.jsx      OUTPUT oscilloscope
    LedDisplay.jsx backlit LED patch browser + spectrum
    Keys.jsx       on-screen touch keyboard
  App.jsx          gesture gate + state wiring (params, cables, patches)
  samples/         ← your hums go here
```
