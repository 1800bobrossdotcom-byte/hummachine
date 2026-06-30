import Knob from './Knob.jsx'
import LedDisplay from './LedDisplay.jsx'
import { PARAMS } from '../audio/params.js'

// The faceplate: backlit LED browser on the left, knob bank on the right.
export default function Panel({ engine, started, params, onParam, patch }) {
  return (
    <div className="panel">
      <LedDisplay
        engine={engine}
        started={started}
        patchName={patch.name}
        patchIndex={patch.index}
        patchTotal={patch.total}
        isFactory={patch.isFactory}
        note={patch.note}
        onPrev={patch.onPrev}
        onNext={patch.onNext}
        onSave={patch.onSave}
      />
      <div className="knobs">
        {PARAMS.map((spec) => (
          <Knob
            key={spec.key}
            spec={spec}
            value={params[spec.key]}
            onChange={(v) => onParam(spec.key, v)}
          />
        ))}
      </div>
    </div>
  )
}
