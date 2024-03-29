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

  latest = undefined
  effect = undefined

  observe() {
    let active = Reactor.active
    if (active) {
      this._outputs.add(active)
      active._inputs.add(this)
      if ((active == this) || (this._staleInputs > 0)) {
        throw Error(`Cycle detected in ${active._label ?? '?'}`)
      }
    }
    return this.latest
  }

  stale() {
    if (this._becomingStale) { return /* cycle */ }
    if (++this._staleInputs == 1) {
      this._becomingStale = true
      for (const o of this._outputs) { o.stale() }
      this._becomingStale = false
    }
  }

  fresh(changed = true) {
    if (this._staleInputs == 0) { return /* cycle */ }
    if (changed) { this._inputChanged = true }
    if (--this._staleInputs == 0) {
      if (this._inputChanged && (this.effect != null)) {
        let oldValue = this.latest
        this.effect()
        changed = (this.latest !== oldValue)
      }
      this._inputChanged = false
      for (const o of this._outputs) { o.fresh(changed) }
    }
  }

  track(fn) {
    const oldInputs = this._inputs
    this._inputs = new Set()
    const oldActive = Reactor.active
    Reactor.active = this
    try {
      return fn()
    } catch(err) {
      return err
    } finally {
      Reactor.active = oldActive
      for (const i of oldInputs.difference(this._inputs)) {
        i._outputs.delete(this)
      }
    }
  }

  dispose() {
    for (const i of this._inputs) { i._outputs.delete(this) }
    for (const o of this._outputs) { o._inputs.delete(this) }
    this._inputs.clear()
    this._outputs.clear()
  }
}



////////////////////////////////////////////////////////////////////////
// Shims

if (Set.prototype.difference == null) {
  Set.prototype.difference = function(other) {
    const diff = new Set()
    if (this.size > other.size) {
      for (let item of other) if (!this.has(item)) diff.add(item);
    } else {
      for (let item of this) if (!other.has(item)) diff.add(item);
    }
    return diff
  }
}


