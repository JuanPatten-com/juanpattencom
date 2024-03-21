////////////////////////////////////////////////////////////////////////
// API

export function Atom(value) {
  const r = new Reactor()
  r.latest = value
  const atom = () => r.observe()
  atom.set = (newValue) => {
    if (newValue == r.latest) { return }
    r.stale()
    r.latest = newValue
    r.fresh(true)
  }
  atom.alter = (transform) => {
    atom.set(transform(r.latest))
  }
  atom.peek = () => r.latest
  atom.dispose = r.dispose.bind(r)
  atom.label = (lbl) => ((r.__label = lbl), atom)
  return atom
}

export function Calc(fn) {
  const r = new Reactor()
  r.effect = () => r.latest = r.track(fn)
  r.effect() // calculate the initial value
  const calc = () => r.observe()
  calc.peek = () => r.latest
  calc.dispose = r.dispose.bind(r)
  calc.label = (lbl) => ((r.__label = lbl), calc)
  return calc
}

export function Effect(action) {
  return Calc(() => { action() })
}


////////////////////////////////////////////////////////////////////////
// Implementation

export class Reactor {
  static running = []

  latest = undefined
  effect = undefined

  #staleInputs = 0
  #changedInputs = 0
  #inputs = new Set()
  #outputs = new Set()

  // Informs the currently-running reactor that this
  // is one of its inputs. Returns the latest value.
  observe() {
    let running = Reactor.running.at(-1)
    if (running) {
      this.#outputs.add(running)
      running.#inputs.add(this)
    }
    return this.latest
  }

  // Records a stale input. If not already stale,
  // becomes stale and notifies its outputs.
  stale() {
    if (++this.#staleInputs == 1) {
      for (const o of this.#outputs) { o.stale() }
    }
  }

  // Records a fresh input. If all are fresh,
  // runs effect (if any) and notifies outputs.
  fresh(didChange) {
    if (didChange) { ++this.#changedInputs }
    if (--this.#staleInputs == 0) {
      if ((this.#changedInputs > 0) && (this.effect != null)) {
        let oldValue = this.latest
        this.effect?.()
        didChange = (this.latest !== oldValue)
        this.#changedInputs = 0
      }
      for (const o of this.#outputs) { o.fresh(didChange) }
    }
  }

  // Executs `fn` and records its inputs.
  track(fn) {
    const oldInputs = this.#inputs
    this.#inputs = new Set()
    Reactor.running.push(this)
    try {
      return fn()
    } finally {
      Reactor.running.pop()
      for (const i of oldInputs.difference(this.#inputs)) {
        i.#outputs.delete(this)
      }
    }
  }

  // Removes this reactor from the dependency graph
  dispose() {
    for (const i of this.#inputs) { i.#outputs.delete(this) }
    for (const o of this.#outputs) { o.#inputs.delete(this) }
    this.#inputs.clear()
    this.#outputs.clear()
  }
}

