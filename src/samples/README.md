# Drop your hums here

Anything you put in this folder is auto-detected, pitch-mapped, and **base64-inlined
into the final `index.html`** at build time — no code changes needed.

## Naming

The filename (before the extension) is the only thing that matters.

| Pattern | Meaning |
| --- | --- |
| `note_C3.mp3` | a pitched hum at C3 — playable across the keyboard |
| `note_F#4.ogg` | sharps: use `#` (or `s`, e.g. `note_Fs4.ogg`) |
| `note_Eb2.mp3` | flats with `b` |
| `phrase_01.mp3` | a hummed phrase / loop, layered by the auto-player |
| `phrase_drone.ogg` | any `phrase_*` name works |

Pitch uses scientific notation where **A4 = 440 Hz = `A4`** (so middle C is `C4`).

## How many to send

- **One** sustained hum → it gets pitch-shifted across the whole keyboard.
- **A handful** (e.g. `note_C3`, `note_C4`, `note_C5`) → smoother, more natural.
- **Many discrete pitches** → a true multisampled "you". Best fidelity.
- Plus any **phrases/loops** as `phrase_*` for the generative wash.

## Format tips

- Prefer **compressed `.mp3` or `.ogg`** — they embed far smaller than `.wav`,
  keeping the minted token thin. (`.wav/.flac/.m4a/.aac` also work.)
- Trim silence; a clean sustained middle loops best.
- Mono is fine and smaller.

When this folder is empty, hummachine plays **procedural placeholder hums** so the
instrument is fully playable before your recordings arrive.
