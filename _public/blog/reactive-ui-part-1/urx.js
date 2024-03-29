////////////////////////////////////////////////////////////////////////
// API

export function Atom(value) {
  const r = new Reactor()
  r.latest = value
  const atom = () => r.observe()
  atom.set = (newValue) => {
    if (newValue === r.latest) { return }
    r.stale()
    r.latest = newValue
    r.fresh()
  }
  atom.peek = () => r.latest
  atom.dispose = r.dispose.bind(r)
  atom.label = (lbl) => ((r._label = lbl), atom)
  atom.$r = r
  return atom
}

export function Calc(fn) {
  const r = new Reactor()
  r.effect = () => r.latest = r.track(fn)
  r.effect() // calculate the initial value
  const calc = () => r.observe()
  calc.peek = () => r.latest
  calc.dispose = r.dispose.bind(r)
  calc.label = (lbl) => ((r._label = lbl), calc)
  calc.$r = r
  return calc
}

export function Effect(action) {
  return Calc(() => { action() })
}


////////////////////////////////////////////////////////////////////////
// Implementation

export class Reactor {
  static active = null

  _label = undefined

  _inputs = new Set()
  _outputs = new Set()

  _staleInputs = 0
  _inputChanged = false
  _becomingStale = false
  _runningEffect = false

  latest = undefined
  effect = undefined

  observe() {
    let active = Reactor.active
    if (active) {
      this._outputs.add(active)
      active._inputs.add(this)
      if ((active == this) || (this._staleInputs > 0)) {
        this._cycleDetected()
      }
    }
    return this.latest
  }

  stale() {
    if (this._becomingStale) { return /* cycle detected later */ }
    if (++this._staleInputs == 1) {
      for (const o of this._outputs) { o.stale() }
    }
  }

  fresh(changed = true) {
    if (this._runningEffect) { return /* cycle detected later */ }
    if (changed) { this._inputChanged = true }
    --this._staleInputs
    if (this._staleInputs == 0) {
      if (this._inputChanged && (this.effect != null)) {
        let oldValue = this.latest
        this._runningEffect = true
        this.effect()
        this._runningEffect = false
        changed = (this.latest !== oldValue)
      }
      this._inputChanged = false
      for (const o of this._outputs) { o.fresh(changed) }
    } else if (this._staleInputs < 0) {
      this._staleInputs = 0
    }
  }

  track(fn) {
    const oldInputs = this._inputs
    const oldActive = Reactor.active
    this._inputs = new Set()
    Reactor.active = this
    try {
      let result = fn()
      for (const i of oldInputs.difference(this._inputs)) {
        i._outputs.delete(this)
      }
      return result
    } catch (err) {
      this._inputs = oldInputs
    } finally {
      Reactor.active = oldActive
    }
  }

  dispose() {
    for (const i of this._inputs) { i._outputs.delete(this) }
    for (const o of this._outputs) { o._inputs.delete(this) }
    this._inputs.clear()
    this._outputs.clear()
  }

  _cycleDetected() {
    this._staleInputs = 0
    this._inputChanged = false
    this._runningEffect = false
    this._becomingStale = false
    throw Error(`Cycle detected in ${Reactor.active._label ?? '?'}`)
  }
}







