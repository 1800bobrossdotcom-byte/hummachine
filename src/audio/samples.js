import { nameToMidi } from './theory.js'
import { makeHumBuffer, makePhraseBuffer } from './procedural.js'

// ── How your real humming gets in ────────────────────────────────────────────
// Drop audio files into src/samples/ and they are picked up automatically — no
// code changes. Vite inlines them as base64 at build time, so the final
// index.html stays fully self-contained.
//
// Naming convention (the part before the dot is what matters):
//   note_C3.mp3   note_F#4.mp3   note_Eb2.ogg   → pitched samples for the keyboard
//   phrase_01.mp3  phrase_drone.ogg             → phrase / loop layer
//
// Send as few as one sustained hum (it gets pitch-shifted across the whole
// keyboard) or many discrete pitches (a true multisampled "you"). Both work.
// Prefer compressed .mp3/.ogg to keep the token thin.
// ─────────────────────────────────────────────────────────────────────────────

const noteFiles = import.meta.glob('../samples/note_*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const phraseFiles = import.meta.glob('../samples/phrase_*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function midiFromPath(path) {
  // ../samples/note_C#3.mp3 -> "C#3"
  const file = path.split('/').pop()
  const stem = file.replace(/^note_/, '').replace(/\.[^.]+$/, '')
  return nameToMidi(stem)
}

async function decode(ctx, url) {
  const res = await fetch(url)
  const arr = await res.arrayBuffer()
  return await ctx.decodeAudioData(arr)
}

export async function loadSamples(ctx, sampler) {
  const noteEntries = Object.entries(noteFiles)
  const phraseEntries = Object.entries(phraseFiles)

  if (noteEntries.length === 0) {
    // No real hums yet → procedural placeholder instrument.
    for (const midi of [45, 50, 55, 60, 64, 67, 72, 76]) {
      sampler.addNote(midi, makeHumBuffer(ctx, midi))
    }
    sampler.addPhrase(makePhraseBuffer(ctx, 60, [0, 3, 7, 10, 7, 3]))
    sampler.addPhrase(makePhraseBuffer(ctx, 55, [0, 5, 7, 12]))
    return { source: 'placeholder', notes: 8, phrases: 2 }
  }

  let loaded = 0
  await Promise.all(
    noteEntries.map(async ([path, url]) => {
      const midi = midiFromPath(path)
      if (midi == null) {
        console.warn(`hummachine: could not parse pitch from ${path}; skipping`)
        return
      }
      try {
        sampler.addNote(midi, await decode(ctx, url))
        loaded++
      } catch (e) {
        console.warn(`hummachine: failed to decode ${path}`, e)
      }
    }),
  )

  await Promise.all(
    phraseEntries.map(async ([, url]) => {
      try {
        sampler.addPhrase(await decode(ctx, url))
      } catch (e) {
        console.warn('hummachine: failed to decode phrase', e)
      }
    }),
  )

  // Safety net: if every note failed to decode, fall back so it still plays.
  if (!sampler.ready) {
    for (const midi of [48, 55, 60, 67, 72]) sampler.addNote(midi, makeHumBuffer(ctx, midi))
    return { source: 'placeholder', notes: 5, phrases: 0 }
  }

  return { source: 'hums', notes: loaded, phrases: phraseEntries.length }
}
