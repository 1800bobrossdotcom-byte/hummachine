// Web MIDI input. Lets a hardware controller play hummachine live. Optional and
// gracefully absent where the API/permission isn't available.

export function initMidi({ onNoteOn, onNoteOff, onStatus } = {}) {
  if (!navigator.requestMIDIAccess) {
    onStatus && onStatus('unavailable')
    return () => {}
  }

  let access = null
  const handlers = []

  const handle = (msg) => {
    const [status, data1, data2] = msg.data
    const command = status & 0xf0
    if (command === 0x90 && data2 > 0) {
      onNoteOn && onNoteOn(data1, data2 / 127)
    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      onNoteOff && onNoteOff(data1)
    }
  }

  const attach = (a) => {
    let count = 0
    a.inputs.forEach((input) => {
      input.onmidimessage = handle
      handlers.push(input)
      count++
    })
    onStatus && onStatus(count > 0 ? 'connected' : 'waiting')
  }

  navigator
    .requestMIDIAccess()
    .then((a) => {
      access = a
      attach(a)
      a.onstatechange = () => attach(a)
    })
    .catch(() => onStatus && onStatus('denied'))

  return () => {
    handlers.forEach((input) => (input.onmidimessage = null))
    if (access) access.onstatechange = null
  }
}
