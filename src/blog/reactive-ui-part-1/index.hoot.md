$[set meta {
  title   "Let's Build a Reactive UI Framework -- Part 1: Data Flow"
  date    2024-03-13
}]

$[set extraStyles {
    <style>
        @media (prefers-color-scheme: light) {
            .depgraph-stroke {
                stroke: #1d1d1d;
            }
            .depgraph-fill {
                fill: #1d1d1d;
            }
        }
        @media (prefers-color-scheme: dark) {
            .depgraph-stroke {
                stroke: rgb(225 225 225);
            }
            .depgraph-fill {
                fill: rgb(225 225 225);
            }
        }
    </style>
}]

$[set toc {
  {"The Basics" the-basics} {}
  {"The Jargon" the-jargon} {}
  {"The Library" the-library} {
    {"Atom" atom} {}
    {"Calc" calc} {}
    {"Effect" effect} {}
  }
  {"The Algorithm" the-algorithm}
}]

-----

# $[@ $meta title]

```
{{ WRITE AN INTRO }}
```

The goal is simple implementation, with reasonable performance.

## The Basics

Let's start by thinking about the fundamental building blocks of our
system. To borrow some [popular terminology][tarpit], we have 2 basic
types of data:

- __*Input data*__ are facts that aren't reducible to any other
  facts. These must be told to us, and we must persist them somewhere
  like a database.
- __*Derived data*__ are facts which can be calculated from the input
  data. These do not need to be told to us, and we do not
  need[^real-world-caching] to persist them.

If that makes intuitive sense, feel free to skip the following examples.

<details>
<summary>Example 1: The Canonical Rectangle Example</summary>
<p>
Pretend we are making an app which displays some facts about a
rectangle. Namely, the <code>width</code>, <code>height</code>,
<code>area</code>, and <code>diagonal</code> of the rectangle.
</p>
<p>
The rectangle's <code>width</code> and <code>height</code> are <em>input
data</em>, because the only way we can know these facts is to be told
them. On the other hand, the <code>area</code> and <code>diagonal</code>
are <em>derived data</em>, because they can be calculated from
the <code>width</code> and <code>height</code>.
</p>
</details>

<details>
<summary>Example 2: Filling Out a Form</summary>
<p>
Think of filling out a typical web form. There are some form fields,
which may be valid or invalid. If they are valid, <tt>Submit</tt> button
is enabled. If they are invalid, the <tt>Submit</tt> button is disabled,
and an error message is displayed.
</p>
<p>
The form fields are the <em>input data</em>. Whether they are valid or
invalid is <em>derived data</em>. Additionally, the state of the
<tt>Submit</tt> button and whether the error message is displayed are
also <em>derived data</em>.
</p>
</details>

<details>
<summary>Example 3: A Spreadsheet</summary>
<p>
The most direct & visceral example is a spreadsheet. Some cells are just
numbers (<em>input data</em>), and some are equations which reference
other cells (<em>derived data</em>). When one of the input cells is
updated, all the cells that are derived from that cell update
automatically.
</p>
<p>
Reactive framework people want all UIs to work like
spreadsheets. 
</p>
</details>

### Derived Data, Flowing

The goal of a "reactive" framework is for the only mutable state in our
system to be input data. When we make changes to the input data, all the
derived data should automatically update to reflect the change. The
system "reacts" to changes in the input data.

In particular, <b class=semibold>the entire user interface is derived
data</b>. This is the core idea of frameworks like [React][reactjs]
when they say "UI is a pure function of state".

### Terminology

Let's start by defining some terms:

- An **`Atom`** is an indivisible piece of input data. We can change an
  `Atom`'s value only by replacing it with a new value.

- A **`Calc`** is an individual piece of derived data, ie. a function
  that `calc`ulates some value based on `Atom`s and other `Calc`s.

- `Atom` and a `Calc` are both a kind of __*fact*__, which we define
  because it's more convenient than typing "`Atom` or `Calc`" every
  time.

- If a `Calc` uses the value of a fact, we say it __*observes*__ that
  fact. Whenever the observed fact changes, the `Calc` will
  automatically re-calculate.

- If `Child` observes `Parent`, we say that `Child` is a __*dependent*__
  of `Parent`, and that `Parent` is a __*dependency*__ of `Child`.

- As `Calc`s depend on other `Calc`s, which in turn depend on other
  `Calc`s and `Atom`s, we are forming a __*[dependency
  graph](https://en.wikipedia.org/wiki/Dependency_graph)*__.

-----

## Library API

Let's sketch out how we might turn these ideas into a library. First
we'll think about the API we want, and work backwards from there to the
implementation.

### `Atom`

An `Atom` starts with an initial value:

```javascript
let x = Atom(5)  // x's value is 5
```

To change an `Atom`'s value, we can either set it directly:

```javascript
x.set(10)  // x's value is 10
```

or apply a function to its current value:

```javascript
x.alter(x => x * 2)  // x's value is 20
```

To get the current value of an `Atom`, we call it like a function:

```javascript
x()  // => 20
```

If a `Calc` uses the value of an `Atom`, it observes that `Atom`. This
is usually what we want, but if we want to look without observing, we
can *peek*:

```javascript
x.peek()  // => 20
```

That's all for `Atom`.[^atom-dispose]

### `Calc`

A `Calc` is just a function. Ideally a [pure function][pure-function]:

```javascript
let xSquared = Calc(() => x() ** 2)
```

<sup>Notice that this `Calc` observes the value of the `Atom` we created
earlier.</sup>

To get the current value of a `Calc`, we call it like
a function:

```javascript
xSquared()  // => 400
```

`Calc`s can also observe other `Calc`s:

```javascript
let xSquaredPlus2 = (() => xSquared() + 2)
```

We can peek at a `Calc` without observing it:

```javascript
xSquaredPlus2.peek()  // => 402
```

That's all for `Calc`.[^calc-dispose]

### `Effect`

An `Effect` is like a `Calc`, but instead of calculating a new value
when a fact changes, an effect *does something* when a fact changes:
logs to the console, makes a network request, updates the UI, etc...

An `Effect` is just a function that will be re-run whenever any of its
observed facts change:

```javascript
let logger = Effect(() => console.log(`x == \${x()}`))
```

> Is a `Calc` just a special case of an `Effect`? Kind
of.[^calc-effect-duality]

That's all for `Effect`[^effect-dispose].

### Example Usage

Here's an example of what using the library should look like:

```javascript

```

-----

## Library Implementation

Now that we've got an API in mind, let's start working on an
implementation.

### Automatic Dependencies

Part of the "magic" feeling of a reactive framework is that it we never
have to explicitly specify dependencies. The system figures them out for
us.

This is not only convenient, but important. If we have to manually
specify dependencies, it's easy to make mistakes. For any given `Calc`,
we might "oversubscribe" (continue observing a fact that is no longer
needed) or "undersubscribe" (forget to observe a fact, and thus don't
react when it changes).

How does the system automatically figure out dependencies? It's
surprisingly simple:

1. It keeps track of which `Calc` is currently running.
2. In the getter of a fact, it tells the currently running `Calc` (if
   any) to observe itself.

### Reacting to Changes

Every time an `Atom` is updated, we need to figure out two things:

1. Every `Calc`[^atoms-dont-have-inputs] that could possibly change
   based on the `Atom`'s new value. We'll call these __*stale*__.
2. The order in which to recalculate. If `Child` depends on `Parent`,
   then `Parent` needs to recalculate before `Child`. Specifically:
   - A `Calc` *may* recalculate if and only if all of its dependencies
     are __*fresh*__ (ie. not stale).
   - A `Calc` *should* recalculate if and only if any of its
     dependencies actually changed value.

Let's imagine a dependency graph that looks like this:

<div class=frame75>
$[contentsOf ./depgraph-start.svg]
</div>

Squares are `Atom`s. Circles are `Calc`s. Arrows mean "depends-on".

Here's how it works:

1. When an `Atom` is told to change its value, it will first notify all
   its dependents that it is stale. They will in turn notify all their
   dependents, and so forth. When this is done, every fact that could
   possibly be affected by the change has been marked stale.

<div class=frame75>
$[contentsOf ./depgraph-step1.svg]
</div>

2. Each fact keeps track of how many of its dependencies are
   stale. Notice in the example that `C3` has two stale dependencies:
   `C1` and `A1`.

3. The `Atom` stores its new value and notifies all its dependents that
   it is fresh. When a `Calc` is notified that one of its dependencies has become
   fresh, it recalculates *if and only if* all of its dependencies are
   now fresh.

<div class=frame75>
$[contentsOf ./depgraph-step2.svg]
</div>

> At this point, `C1` can recalculate, because all of its dependencies
> (just `A1`) are fresh. However, `C3` cannot recalculate yet because
> one of its dependencies (`C1`) is still stale.

5. Once a `Calc` recalculates, it is now fresh, and it notifies its
   dependents.

<div class=frame75>
$[contentsOf ./depgraph-step3.svg]
</div>

> `C3` may now recalculate -- as can `C4` and `C6` -- because all of
> their dependencies are fresh.

6. This process continues until all facts are fresh.

<div class=frame75>
$[contentsOf ./depgraph-step4.svg]
</div>

It's worth noting that when a `Calc` recalculates, it might end up with
a new set of dependencies. For example, a form will no longer depend
on `errorMessage` if all its inputs are valid.

If we imagine that `C7` was our form:

<div class=frame75>
$[contentsOf ./depgraph-final.svg]
</div>

### And Now, Some Code

Now that we've got a sense for how things should work, we can start
implementing our library.

Notice that `Atom` and `Calc` have overlapping functionality: they both
maintain some `latest` value, can both be observed, and both are able to
update their dependents when their latest value changes.

Let's call this shared functionality a `Publisher`. We'll say that
a `Publisher`'s dependents are its `outputs`.

The flip side of a `Publisher` is a `Subscriber`. We'll say that
a `Subscriber`'s dependencies are its `inputs`.

<details>
<summary>
A Note on Nomenclature
</summary>
<p>
We could call these "observable" and "observer", but I find those
names a bit clunky, and they tend to blur together when I'm scanning
code. "Publisher" and "subscriber" are more more obvious terms. As
a bonus they are also conveniently abbreviated: "pub" and "sub".
</p>
<p>
Likewise with "dependency" and "dependent" &ndash; they are just too
similar.  "Input" and "output" are much more obvious and scannable.
</p>
</details>

```javascript
const runningSubscribers = []

class Publisher {
  latest = undefined
  outputs = new Set()

  constructor(initialValue) {
    this.latest = initialValue
  }

  getValue() {
    runningSubscribers.at(-1)?.observe(this)
    return this.latest
  }

  becomeStale() {
    for (const o of this.outputs) o.inputIsStale()
  }

  becomeFresh() {
    for (const o of this.outputs) o.inputIsFresh()
  }
}


class Subscriber {
  #staleInputs = 0
  #changedInputs = 0

  #onStale; #onFresh

  inputs = new Set()

  constructor({onStale, onFresh}) {
    this.#onStale = onStale ?? (() => {})
    this.#onFresh = onFresh ?? (() => {})
  }

  observe(pub) {
    this.inputs.add(pub)
    pub.outputs.add(this)
  }
  
  recordInputsOf(fn) {
    const oldInputs = this.inputs
    this.inputs = new Set()
    runningSubscribers.push(this)
    let result = fn()
    runningSubscribers.pop()
    for (const i of oldInputs.difference(this.inputs)) {
      i.outputs.delete(this)
    }
    return result
  }

  inputIsStale() {
    if (++this.#staleInputs == 1) { this.#onStale() }
  }

  inputIsFresh(didChange) {
    if (didChange) { ++this.#changedInputs }
    if (--this.#staleInputs == 0) {
      this.#onFresh(this.#changedInputs > 0)
      this.#changedInputs = 0
    }
  }

  dispose() {
    for (const i of this.inputs) { i.outputs.delete(this) }
    this.inputs.clear()
  }
}
```

Now we can implement our API on top of these.

An `Atom` has no dependencies. It is just a `Publisher`:

```javascript
export function Atom(value) {
  const pub = new Publisher(value)
  const getter = () => pub.observe()
  getter.peek = () => pub.latest
  getter.set = (newValue) => {
    if (newValue == pub.latest) { return }
    pub.becomeStale()
    pub.latest = newValue
    pub.becomeFresh(true)
  }
  getter.alter = (fn) => {
    getter.set(fn(pub.latest))
  }
  getter.dispose = () => pub.dispose()
  return getter
}
```

A `Calc` is both a `Publisher` and a `Subscriber`:

```javascript
export function Calc(compute) {
  const pub = new Publisher()
  const sub = new Subscriber({
    onStale: () => {
      pub.becomeStale()  // notify our dependents
    },
    onFresh: () => {
      recompute()
      pub.becomeFresh()
    }
  })
  function recompute() {
    pub.latest = sub.observeRefsOf(compute)
  }
  let getter = () => pub.observe()
  getter.peek = () => pub.latest
  getter.dispose = () => {
    pub.dispose()
    sub.dispose()
  }
  recompute()
  return getter
}
```

An `Effect` is just a `Calc` whose value never changes:

```javascript
export function Effect(action) {
  return Calc(() => action())
}
```

-----

## Effect

An `Effect` is like a `Calc`, but instead of calculating a new value
when a fact changes, an effect *does something* when a fact changes:
logs to the console, makes a network request, updates the UI, etc...

An `Effect` is just a function that will be re-run whenever any of its
observed facts change:

```javascript
let logger = Effect(() => console.log(`x == \${x()}`))
```

> Is a `Calc` just a special case of an `Effect`? Kind
of.[^calc-effect-duality]

That's all for `Effect`[^effect-dispose].

-----

## Optimizations

- TODO: stale != changed
- TODO: cycle detection


-----

**`u`** for micro (because `μ` is harder to type)<br>
**`rx`** for "reaction" -- a common abbreviation <br>
**`.js`** for
... you got this one.

It's available on GitHub, so... ✔ that'll do.

-----

If you liked this post, you might be interested in:

- [Build Systems à la Carte](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf)

-----

[^real-world-caching]: Though in practice, some derived data is so
    expensive to calculate that we end up caching it.

[^atom-dispose]: Almost. We also need to be able to `dispose()` of an
    `Atom`, but we'll get to that later.

[^calc-dispose]: Almost. We also need to be able to `dispose()` of
    a `Calc`, but we'll get to that later.

[^effect-dispose]: Almost. We also need to be able to `dispose()` of an
    `Effect`, but we'll get to that later.

[^calc-effect-duality]: We could say that a `Calc` is just an `Effect`
    whose action is to recompute & store its value.  Or is it the other
    way around? Maybe an `Effect` is just a `Calc` whose value is always
    `undefined`.

    Both are valid ways of looking at it, but in our implementation the
    latter is actually true. And that comes with a benefit: we can
    easily model serial processes via cascading `Effect`s.


[^atoms-dont-have-inputs]: Since `Atom`s don't depend on anything, no
    other `Atom` could possibly change.

[^topo-sort]: We could do a [topological sort][topo-sort] on the
    dependency graph and then go in order.

-----

[tarpit]: https://curtclifton.net/papers/MoseleyMarks06a.pdf
[reactjs]: https://react.dev
[pure-function]: https://en.wikipedia.org/wiki/Pure_function
[topo-sort]: https://en.wikipedia.org/wiki/Topological_sorting
