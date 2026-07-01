import Knob from './Knob.jsx'
import Scope from './Scope.jsx'

// One Eurorack-style module: title strip, its knobs, an optional scope (OUTPUT),
// and its jacks at the bottom. Jacks carry data-* attributes so the Rack's cable
// layer can find them by id and validate connections.
export default function Module({ spec, params, onParam, engine }) {
  return (
    <div className={`module module-${spec.type}`}>
      <div className="module-title">{spec.title}</div>

      {spec.type === 'out' && <Scope engine={engine} />}

      {spec.params.length > 0 && (
        <div className="module-knobs">
          {spec.params.map((p) => (
            <Knob key={p.key} spec={p} value={params[p.key]} onChange={(v) => onParam(p.key, v)} />
          ))}
        </div>
      )}

      <div className="module-jacks">
        {spec.jacks.map((j) => {
          const id = `${spec.id}.${j.name}`
          return (
            <div
              key={id}
              className={`jack jack-${j.kind} jack-${j.signal}`}
              data-jack={id}
              data-kind={j.kind}
              data-signal={j.signal}
              title={`${j.name} (${j.signal} ${j.kind})`}
            >
              <span className="jack-port" />
              <span className="jack-label">{j.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
