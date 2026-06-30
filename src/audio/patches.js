import { FACTORY_PATCHES } from './params.js'

// Patch storage. Factory presets are always present; user patches persist to
// localStorage when available (NFT iframes can sandbox it — we degrade to an
// in-memory list so Save still works for the session).

const KEY = 'hummachine.patches.v1'
let memory = null // in-memory fallback

function readUser() {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(KEY)
    memory = raw ? JSON.parse(raw) : []
  } catch {
    memory = []
  }
  return memory
}

function writeUser(list) {
  memory = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sandboxed — keep it in memory for this session */
  }
}

// Combined, ordered list: factory first, then user patches.
export function listPatches() {
  return [...FACTORY_PATCHES, ...readUser()]
}

export function savePatch(name, params) {
  const list = readUser()
  const clean = name.trim() || `PATCH ${list.length + 1}`
  const existing = list.findIndex((p) => p.name.toUpperCase() === clean.toUpperCase())
  const entry = { name: clean, factory: false, params: { ...params } }
  if (existing >= 0) list[existing] = entry
  else list.push(entry)
  writeUser(list)
  return listPatches().findIndex((p) => !p.factory && p.name === clean) // index in combined list
}

export function deletePatch(name) {
  const list = readUser().filter((p) => p.name !== name)
  writeUser(list)
}
