# hummachine

A playable synth **NFT** built from human humming — *human · machine*.

The whole instrument compiles to a **single self-contained `index.html`** (JS, CSS,
and your hum samples all base64-inlined) so it can be minted as an HTML /
`animation_url` token on **Manifold** and listed on **SuperRare**. No servers, no
external links, nothing to rot — the token *is* the synth.

## What it does

- **Auto-plays** on open: a slow, evolving wash of held hums and phrases.
- **Take over any time** — the moment you play a note, it hands you control.
- Three ways to play, all live at once:
  - on-screen keyboard (mouse + multitouch)
  - computer keyboard (Ableton-style: `z s x d c…`, two rows, arrows shift octave)
  - **Web MIDI** — plug in a controller and play it with your hands
- A reactive radial-waveform visual driven by the live audio.
- Built from **your voice**: drop hums in `src/samples/` and they become the instrument.

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
    engine.js      conductor: AudioContext, master chain, input routing, takeover
    sampler.js     polyphonic multisampler (nearest-sample pitch shifting + ADSR)
    samples.js     auto-loads src/samples/*, else procedural fallback
    procedural.js  synthesized placeholder hum + phrase buffers
    autoplay.js    generative auto-player (lookahead scheduler)
    midi.js        Web MIDI input
    keyboard.js    computer-keyboard input
    theory.js      note-name ↔ MIDI, scales
  components/
    Visualizer.jsx radial-waveform canvas
    Keys.jsx       on-screen touch keyboard
  App.jsx          gesture gate + HUD wiring
  samples/         ← your hums go here
```
