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

The primary goal is to distill the idea down to its essence and see how
simple we can make the implementation. The core ideas of the system is
easy to describe in plain language, but many implementations suffer from
confusing implementation. Let's see if we can do better!

The other primary goal is correctness. Some implementations suffer from
"glitches"[^glitches], but our implementation will be glitch-free.

In the initial implementation, speed is barely considered, and some
redundant calculations are not eliminated. In the
[Optimizations](#optimizations) section, we'll address some low-hanging
performance fruit.

## The Core Idea

The goal of a reactive system is to simplify the way we handle two
basic types of data[^tarpit]:

- __*Derived data*__ which can be calculated from other data in the system.
- __*Input data*__ which cannot. We have to read/store this data.

The distinction between the two can be fuzzy[^mouse-position-derived] in
theory, but in practice it's a useful distinction to guide how we design
our data and shared state.

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

### Derived Data, Flowing {#derived-data-flowing}

The goal of a "reactive" framework is that we only store input data as
mutable state. Everything else is derived from that, and updates
automatically when we change the input data.

The core idea behind libraries like [React][reactjs] is that <b
class=semibold>the entire user interface is derived data</b>.

### Glossary

- An **`Atom`** is an individual piece of input data.
- A **`Calc`** is an individual piece of derived data.
- `Atom` and a `Calc` are both a kind of __*fact*__.
- If a `Calc` uses the value of a fact, it __*observes*__ that
  fact. When the observed fact changes, the `Calc` will automatically
  re-calculate.
- If `Child` observes `Parent`, then:
    - `Parent` is a __*dependency*__ of `Child`.
    - `Child` is a __*dependent*__ of `Parent`
- The web of facts observing other facts forms a __*[dependency
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

Setting an `Atom`'s value will cause all its dependents to recalculate:

```javascript
x.set(10)  // x's value is 10
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

-----

## Usage Example

To get a sense for how the library feels "on the page":

<details>
<summary>Example Code</summary>
<pre><code class="language-javascript">let fullName = Atom('James Bond')
let intro = Atom("The name's")
let punct = Atom('.')

let first = Calc(() => fullName().split(' ')[0])
let last = Calc(() => fullName().split(' ')[1])

let sentence = Calc(() =>
  `\${intro()} \${last()}\${punct()} \${first()} \${last()}\${punct()}`)


let logger = Effect(() => {
  console.log(sentence())
})


fullName.set('Mary Oliver')

intro.set(intro.peek() + ' still')

after(1000, () => {
  punct.set('?')
  intro.set('Wait… is my name')
})
</code></pre>
</details>

<details>
<summary>Example Console Output</summary>
<pre>The name's Bond. James Bond.
The name's Oliver. Mary Oliver.
The name's still Oliver. Mary Oliver.
The name's still Oliver? Mary Oliver?
Wait… is my name Oliver? Mary Oliver?</pre>
</details>

-----

## Library Implementation

Now that we've got an API in mind, let's start working on an
implementation.

### Automatic Dependencies

Part of the "magic" feeling of a reactive framework is that it we never
have to explicitly specify dependencies. The system figures them out for
us. This is not only convenient, but important.[^manual-deps]

It's surprisingly simple to do: It keeps a stack of currently-running
observers, and any time a fact's value is read, it looks to see if there
is a currently running observer. If so, it adds itself as an input to
that observer.


### Reacting to Changes

Every time an `Atom` is updated, we need to figure out two things:

1. Every `Calc`[^atoms-dont-have-inputs] that could possibly change
   based on the `Atom`'s new value. We'll call these __*stale*__.
2. The order in which to recalculate affected `Calc`s. A `Calc` can
   recalculate if and only if *all* of its dependencies are __*fresh*__
   (ie. not stale).

#### The Algorithm

Imagine a dependency graph that looks like this:

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-start.svg]
</div>

> Squares are `Atom`s. Circles are `Calc`s. Arrows mean "depends-on".

1. When an `Atom` is told to change its value, it will first notify all
   its dependents that it is stale. They will in turn notify all their
   dependents, and so forth. When this is done, every fact that could
   possibly be affected by the change has been marked stale.

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-step1.svg]
</div>

2. The `Atom` stores its new value.

3. The `Atom` notifies all its dependents that it is fresh. When
   a `Calc` is notified that one of its dependencies has become fresh,
   it recalculates *if and only if* all of its dependencies are now
   fresh.

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-step2.svg]
</div>

> At this point, `C1` can recalculate, because all of its dependencies
> (just `A1`) are fresh. However, `C3` cannot recalculate yet because
> one of its dependencies (`C1`) is still stale.

3. Once a `Calc` recalculates, it is now fresh, and it notifies its
   dependents.

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-step3.svg]
</div>

> `C3` may now recalculate -- as can `C4` and `C6` -- because all of
> their dependencies are fresh.

4. This process continues until all facts are fresh.

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-step4.svg]
</div>

#### Dynamic Dependencies

It's worth noting that when a `Calc` recalculates, it might end up with
a new set of dependencies. Perhaps when `C7` recalculated, it no longer
read the value of `C4`, but instead read the value of `C5`. We would
end up with a graph like this:

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-final.svg]
</div>

### And Now, Some Code

Now we have a sense of how things should work, and we can start
implementing the library.

#### Graph Management

Notice that `Atom` and `Calc` share a lot of functionality around
maintaining the dependency graph and propagating information through
it. Let's factor that functionality out into a base. We could call it
"GraphNode", but for the sake of style let's call it... `Reactor`.

<small>

> **Note**
>
> I use the term "input" and "output" here instead of "dependency" and
> "dependent", respectively. I find the latter make the code a bit more
> obvious and intuitive. The former tend to blur together on the page.

</small>

```javascript
class Reactor {
  static running = []

  latest = undefined
  effect = undefined

  #staleInputs = 0
  #inputs = new Set()
  #outputs = new Set()

  run(fn) {
    // Execute `fn` and record its inputs.
    const oldInputs = this.#inputs
    this.#inputs = new Set()
    Reactor.running.push(this)
    let result = fn()
    Reactor.running.pop()
    for (const i of oldInputs.difference(this.#inputs)) {
      i.#outputs.delete(this)
    }
    return result
  }

  observe() {
    // Inform the currently-running reactor that this
    // is one of its inputs, and return the latest value.
    let running = Reactor.running.at(-1)
    if (running) {
      this.#outputs.add(running)
      running.#inputs.add(this)
    }
    return this.latest
  }

  stale() {
    // If not stale, become stale and notify dependents.
    if (++this.#staleInputs == 1) {
      for (const o of this.#outputs) o.stale()
    }
  }

  fresh() {
    // If all this reactor's inputs are fresh, perform
    // its effect (if any) and notify its dependents.
    if (--this.#staleInputs == 0) {
      this.effect?.()
      for (const o of this.#outputs) o.fresh()
    }
  }
}
```

Implementing our API on top of `Reactor` is straightforward.

#### `Atom`

An `Atom` is a `Reactor` that doesn't have an effect. Notice that its
`set` method is -- precisely -- steps 1-3 from [the
algorithm](#the-algorithm).

```javascript
export function Atom(value) {
  const r = new Reactor()
  r.latest = value
  const atom = () => r.observe()
  atom.set = (newValue) => {
    r.stale()
    r.latest = newValue
    r.fresh()
  }
  atom.peek = () => r.latest
  return atom
}
```

#### `Calc`

A `Calc` is a `Reactor` whose effect is to set the reactor's value to
the result of its calculation.

```javascript
export function Calc(fn) {
  const r = new Reactor()
  r.effect = () => r.latest = r.run(fn)
  r.effect() // calculate the initial value
  const calc = () => r.observe()
  calc.peek = () => r.latest
  return calc
}
```

An `Effect` is just a `Calc` that never has a value:

```javascript
export function Effect(action) {
  return Calc(() => { action() })
}
```

-----

## ~~One~~ Two More Thing*s*...

Our library is now fully functional, but there are a few things I've
omitted up til now for clarity.

### Cancellation / Disposal

How would we stop an `Effect` from running? Right now there's no good
way. Even if we try[^gc-local-var] to have it garbage-collected, it will
keep effect-ing. Since our graph uses 2-way references, an `Effect`'s
dependencies will keep it alive even if we try to destroy it. The same
is true for `Atom` and `Calc` as well.

We need a way to sever the edge between 2 nodes in the graph. Let's add
the following method to the `Reactor` class definition[^weakmap-deps]:

```javascript
class Reactor {
  // ...

  dispose() {
    for (const i of this.#inputs) { i.#outputs.delete(this) }
    for (const o of this.#outputs) { o.#inputs.delete(this) }
    this.#inputs.clear()
    this.#outputs.clear()
  }
}
```

And let's expose it on each of our API primitives:

```javascript
export function Atom(value) {
  // ...
  atom.dispose = r.dispose.bind(r)
  return atom
}

export function Calc(fn) {
  // ...
  calc.dispose = r.dispose.bind(r)
  return calc
}
```

Now users of the library can -- for example -- cancel a logger, etc...

```javascript
let logger = Effect(() => console.log(myAtom()))
setTimeout(() => { logger.dispose() }, 10_000)
```


### Cycle Detection

We could end up in a situation where a `Calc` depdends on itself.

<details>
<summary>Here's a simple example</summary>
<pre><code class="language-javascript">let cycle = [Atom('-')]
let clog = Effect(() => log(cycle[0]() + cycle[1]?.()))

// On first execution, `cycle[1]` will be undefined.
cycle[1] = Calc(() => cycle[0]() + cycle[1]?.())

// But this will cause `cycle[1]` to run again
// and this time it will refer to itself.
cycle[0].set('x')
</code></pre>
</details>

A [cycle](https://en.wikipedia.org/wiki/Cycle_(graph_theory))!
Fortunately, in our library a cycle does not cause an infinite
loop. Instead, it causes stale data to be used (ie. a glitch).

We can easily catch this, though it comes at a cost to performance: when
a `Reactor` is observed, if that same `Reactor` is present in the
`Reactor.running` stack, then we have a cycle.

Let's add the following lines to the `observe()`:

```javascript
observe() {
  if (Reactor.running.includes(this)) {
    throw new Error("Cycle detected")
  }
  // ...
}
```

-----

## Conveniences

- Atom::alter
- label

-----

## Optimizations

- TODO: stale != changed
- TODO: memory savings - atoms don't have inputs


-----

**`u`** for micro (because `μ` is harder to type)<br>
**`rx`** for "reaction" -- a common abbreviation <br>
**`.js`** for
... you got this one.

It's available on GitHub, so... ✔ that'll do.

-----

If you liked this post, you might be interested in:

- [Out of the Tar Pit][tarpit]
- [Build Systems à la Carte][bs-ala-carte]

-----

[^tarpit]: The terminology comes from the classic [Out of the Tar
    Pit][tarpit] (Section 7.1.1), which further granularizes these
    types.

[^mouse-position-derived]: Is the mouse position input data? Or is it
    derived from a starting position and a list of every movement it has
    made since the program started? In theory, the latter. In practice,
    the former. Caching is another place where the line blurs. [Out of
    the Tar Pit][tarpit] has a pretty good treatment of this question in
    section 7.1.1

[^manual-deps]: If we have to manually specify dependencies, it's easy
    to make mistakes. For any given `Calc`, we might "oversubscribe"
    (continue observing a fact that is no longer needed) or
    "undersubscribe" (forget to observe a fact, and thus don't react
    when it changes).

[^calc-effect-duality]: We could say that a `Calc` is just an `Effect`
    whose action is to recompute & store its value.  Or is it the other
    way around? Maybe an `Effect` is just a `Calc` whose value is always
    `undefined`.
    Both are valid ways of looking at it, but in our implementation the
    latter is actually true. And that comes with a benefit: we can
    easily model serial processes via cascading `Effect`s.

[^atoms-dont-have-inputs]: Since `Atom`s don't depend on anything, no
    other `Atom` could possibly change.

[^gc-local-var]: By -- for example -- creating an `Effect` as a local
    variable in a function and then letting it go out of scope.

[^glitches]: A "glitch" is reactive jargon for an inconsistency in
    derived state. <a class=raquo
    href="https://stackoverflow.com/a/25141234/166874">More Info</a>

-----

[tarpit]: https://curtclifton.net/papers/MoseleyMarks06a.pdf
[reactjs]: https://react.dev
[pure-function]: https://en.wikipedia.org/wiki/Pure_function
[topo-sort]: https://en.wikipedia.org/wiki/Topological_sorting
[bs-ala-carte]: https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf
