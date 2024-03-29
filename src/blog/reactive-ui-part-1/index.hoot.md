$[set meta {
  title   "Let's Build a Reactive UI Framework – Part 1: Data Flow"
  date    2024-03-20
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

    #sheet-preview {
      border: none;
      width: 100%;
      height: 15em;
    }

    #sheet-preview.expanded {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 50%;
      z-index: 999;
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

<div class=blog-post-meta>
    <div class=pub-date>Published on Wednesday, March 20, 2024</div>
</div>

Reactive dataflow libraries like [Solid][solidjs] and [MobX][mobx] are
a joy[^libui] to use. They can feel like magic in the same way
a spreadsheet feels like magic. Change one value and watch the effects
ripple through the UI.

The cool thing is that the concepts behind them are actually pretty
simple! In this series of articles, I want to see if we can distill the
reactive dataflow paradigm down to its essence, and implement it in
a straightforward, readable way while still being correct
("glitch-free"[^glitches] as they say) and performant enough to build
real apps.

We'll start by building a simple and correct library, and then we'll
tackle some low-hanging optimization opportunities.

## A Preview

Here's a demo of what we'll be able to make at the end of the
article. Everything is vanilla javascript, and the only library used is
the one we're about to build. You can [view it
full-screen](/blog/reactive-ui-part-1/sheet.html) if you'd rather.

<iframe id=sheet-preview src="/blog/reactive-ui-part-1/sheet.html"></iframe>

<blockquote class=small-text>
<p><strong>Usage Notes</strong></p>
<ul>
  <li>Cell formulas are just Javascript expressions.</li>
  <li>Inside a cell's formula, you can refer to other cells by name, ie
  <tt>a4</tt>.
  </li>
  <li>To finish editing a cell, press <tt>Enter</tt> or <tt>Tab</tt> or
  click out of it.</li>
  <li><tt>Math</tt> functions are exposed directly. Do
  <tt>abs(a4)</tt>, not <del><tt>Math.abs(a4)</tt></del>.
  </li>
  <li>If a cell's formula results in an error, the cell will show
  a ‼️ which you can hover over to see the error.
  </li>
  <li>The ☰ icon opens a sidebar where you can resize the grid.
  </li>
</ul>
</blockquote>


## The Core Idea

There are basically two types of data[^tarpit] in any system:

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

The goal of a reactive dataflow framework is that the only mutable state
in our app is input data. Everything else is derived from that, and
updates automatically when the inputs change.

The idea behind libraries like [React][reactjs] is that <b
class=semibold>the entire UI is derived data</b>.

### Glossary

I'll use the following terms throughout:

- An **`Atom`** is an individual piece of input data.
- A **`Calc`** is an individual piece of derived data.
- `Atom` and `Calc` are both a kind of __*fact*__.
- If a `Calc` uses the value of a fact, it __*observes*__ that
  fact. When the observed fact changes, the `Calc` will automatically
  re-calculate.
- If `Child` observes `Parent`, then:
    - `Parent` is a __*dependency*__ of `Child`.
    - `Child` is a __*dependent*__ of `Parent`.
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

To get the current value of an `Atom`, call it like a function:

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

To get the current value of a `Calc`, call it like a function:

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

setTimeout(() => {
  punct.set('?')
  intro.set('Wait… is my name')
}, 1000)
</code></pre>
</details>

<details>
<summary>Example Console Output</summary>
<pre><code class="language-text">The name's Bond. James Bond.
The name's Oliver. Mary Oliver.
The name's still Oliver. Mary Oliver.
The name's still Oliver? Mary Oliver?
Wait… is my name Oliver? Mary Oliver?</code></pre>
</details>

-----

## Implementation Concepts

Now that we've got an API in mind, let's start working on an
implementation. There are a few things to think about.

### Automatic Dependencies

Part of the "magic" feeling of a reactive framework is that it we never
have to explicitly specify dependencies. The system figures them out for
us. This is not only convenient, but important.[^manual-deps]

And it's surprisingly simple:

- We keep track of the active "observer" (ie. `calc` & `effect`).
- When a `Calc` or `Effect` executes, it sets the active observer to
  itself, and restores the previously active observer when it finishes.
- Any time a fact's value is read, it looks to see if there is an active
  observer. If so, it registers itself as a dependency of that observer.

That's all there is to it.[^auto-deps-threading]


### Reacting to Changes

Every time an `Atom` is updated, we need to figure out two things:

1. Every `Calc`[^atoms-dont-have-inputs] that could possibly change
   based on the `Atom`'s new value. We'll call these __*stale*__.
2. The order in which to recalculate affected `Calc`s. A `Calc` can
   recalculate if and only if *all* of its dependencies are __*fresh*__
   (ie. not stale).

#### The Algorithm[^mobx-algo] {#the-algorithm}

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

And that's it. Now all the `Calc`s that were affected by the change have
recalculated, and we're awaiting another change.

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-start.svg]
</div>

#### Dynamic Dependencies

It's worth noting that when a `Calc` recalculates, it might end up with
a new set of dependencies. Perhaps when `C7` recalculated, it no longer
read the value of `C4`, but instead read the value of `C5`. We would
end up with a graph like this:

<div class="frame75 pin-to-above">
$[contentsOf ./depgraph-final.svg]
</div>

If so, the next time `A1` changes, `C7` will not be recalculated because
it no longer transitively depends on the value of `A1`.

### Errors

In the case where a `Calc`'s function throws an error, we want to treat
that `Error` as if it were the result of the function. That is, after
`badCalc` throws an error, `badCalc.peek()` should return that error.

-----

## And Now, Some Code

Now we have a sense of how things should work, and we can start making
the ideas concrete in code.

### Graph Management

Notice that `Atom` and `Calc` share a lot of functionality around
maintaining the dependency graph and propagating information through
it. Let's factor that functionality out into a base. We could call it
"GraphNode", but for the sake of style let's call it `Reactor`.

In addition to its graph management duties, a Reactor has a `latest`
value, and -- optionally -- an `effect` which will run when its
dependencies become fresh.

<small>

> **A Note on Nomenclature**
>
> I use the terms "input" and "output" here instead of "dependency" and
> "dependent", respectively. I find the latter tend to blur together on
> the page, while the former make things a bit more obvious and
> intuitive.

</small>

```javascript
class Reactor {
  static active = null

  latest = undefined
  effect = undefined

  _staleInputs = 0
  _inputs = new Set()
  _outputs = new Set()

  // Informs the currently-running reactor that this
  // is one of its inputs. Returns the latest value.
  observe() {
    let running = Reactor.running
    if (running) {
      this._outputs.add(running)
      running._inputs.add(this)
    }
    return this.latest
  }

  // Records a stale input. If not already stale,
  // becomes stale and notifies its outputs.
  stale() {
    if (++this._staleInputs == 1) {
      for (const o of this._outputs) { o.stale() }
    }
  }

  // Records a fresh input. If all are fresh,
  // runs effect (if any) and notifies outputs.
  fresh() {
    if (--this._staleInputs == 0) {
      this.effect?.()
      for (const o of this._outputs) { o.fresh() }
    }
  }

  // Executes `fn()` and records its inputs.
  // Returns the result, or any thrown error.
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
}
```

> **NOTE**
>
> As of $[@ $meta date], we'll need to include
> a shim[^set-difference-shim] for `Set.prototype.difference` for Firefox.


### The API

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

A `Calc` is a `Reactor` whose effect is to set its own `latest` value to
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

#### `Effect`

An `Effect` is a `Reactor` that exists only for its effect. Instead of
repeating code from `Calc`, we'll return a `Calc` whose value is always
`undefined`.

```javascript
export function Effect(action) {
  return Calc(() => { action() })
}
```

-----

## ~~One~~ Two More Thing&#x200a;*s*...

The library is fully functional, but there are a couple of gaps which
I've omitted up til now for simplicity's sake.

### Cancellation / Disposal

How would we stop an `Effect` from running? Right now there's no good
way. Even if we try to have it garbage-collected[^gc-local-var], it will
keep effect-ing. Since dependencies keep a reference to their
dependents, an `Effect` will stay it alive even if we try to destroy
it. The same is true for `Atom` and `Calc` as well.

We need a way to sever the edge between nodes in the graph. Let's add
the following method to the `Reactor` class definition:

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

and expose it on each of our API primitives:

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

// Effect returns a Calc, so we
// don't need to change anything.
```


Now users of the library can -- for example -- cancel a logger, etc...

```javascript
let logger = Effect(() => console.log(myAtom()))
setTimeout(() => { logger.dispose() }, 10_000)
```


### Cycles

A `Calc` could end up depdending on itself, forming
a [cycle](https://en.wikipedia.org/wiki/Cycle_(graph_theory)) in the
dependency graph. For example:

```javascript
let cycle = [Atom('')]

// On first execution, cycle[1] will be undefined.
cycle[1] = Calc(() => cycle[0]() + cycle[1]?.())

// But this will cause cycle[1] to run again
// and this time it will refer to itself.
cycle[0].set('!')
```

#### Detecting Cycles

In the above example, the `Calc` *directly* depends on itself. This case
is easy to detect: the `Calc` will be active when it tries to observe
itself.

However a `Calc` directly depending on itself is a bit contrived, and
unlikely in real-world cases. It's much more likely that a cycle would
arise when a `Calc` *indirectly* depends on itself, eg:

<div class="frame75 pin-to-above">
$[contentsOf ./cycle-step1.svg]
</div>

In this case, at the point when the cycle is established, one of the
`Calc`s will try to observe a `Calc` which is stale.

#### Handling Cycles

How exactly we should handle a cycle is an open question, but there are
a few things to consider:

- We want to stay "glitch-free", so a cycle shouldn't result in stale
  data.
- If some `Atom` changes that breaks the cycle (such as the spreadsheet
  cell formula changing), we want the `Calc`s that were previously
  caught in the cycle to recalculate, so we need to be sure that the
  dependency graph stays intact when a cycle is established.

We know we can detect a cycle at the time a `Calc` is observed, so the
approach we'll take is to throw an error in the `observe()` method,
*after* the dependencies are set up:

```javascript
observe() {
  let active = Reactor.active
  if (active) {
    this._outputs.add(active)
    active._inputs.add(this)
    // ↓↓ NEW CODE ↓↓
    if ((Reactor.active == this) || (this._staleInputs > 0)) {
      throw Error('Cycle detected')
    }
    // ↑↑ NEW CODE ↑↑
  }
  return this.latest
}
```

There are two other things to note:

1. `C1`'s stale notification will end up back at itself: 
   **`C1`**&#x200a;→&#x200a;`C3`&#x200a;→&#x200a;`C2`&#x200a;→&#x200a;**`C1`**
2. `C1`'s fresh notification will end up back at itself:
   **`C1`**&#x200a;→&#x200a;`C3`&#x200a;→&#x200a;`C2`&#x200a;→&#x200a;**`C1`**

Both of these cases will cause bugs if not handled, so let's handle
them:

```javascript
class Reactor {
  // ...
  _becomingStale = false  // ← so we can detect a stale() cycle
  // ...
  stale() {
    if (this._becomingStale) { return } // ← avoid modifying state
    if (++this._staleInputs == 1) {
      this._becomingStale = true  // ← set detector
      for (const o of this._outputs) { o.stale() }
      this._becomingStale = false // ← unset detector
    }
  }
  // ...
  fresh(changed = true) {
    if (this._staleInputs == 0) { return } // ← avoid modifying state
    // ...
  }
  // ...
}
```

Now when a cycle happens, the `latest` value of all `Reactor`s in the
cycle will be `Error('Cycle detected')`, and if we later break the cycle
(by ie. changing a spreadsheet cell's formula), all the `Reactor`s which
previously made up the cycle will correctly
recalculate.[^cycle-hand-wave]


-----

## Optimizations

There are many optimizations we could make to improve speed and memory
usage, but one in particular calls out to be addressed.

### Minimizing Recalculations

If a `Calc` recalculates but produces the same value as before, all of
its dependents will still recalculate, even though they don't need
to. It would be good to avoid them if possible, especially because we
anticipate that the effects of some dependents (like UI rendering) will
be expensive.

To do this, we'll need to pass some additional information along with
the `fresh` notification, and add a bit of additional logic:

```javascript
class Reactor {
  // ...

  // Add a private property
  #inputChanged = false

  // ...

  // Add a parameter to fresh(), and a bit of additional logic
  // to avoid running the effect if no inputs have changed.
  fresh(changed = true) {
    if (changed) { this.#inputChanged = true }
    if (--this.#staleInputs == 0) {
      if (this.#inputChanged && (this.effect != null)) {
        this.#inputChanged = false // reset for next time
        let oldValue = this.latest
        this.effect()
        changed = (this.latest !== oldValue)
      }
      for (const o of this.#outputs) { o.fresh(changed) }
    }
  }
}
```

And let's add a check at the beginning of `Atom`'s `set` method:

```javascript
export function Atom(value) {
  // ...
  atom.set = (newValue) => {
    if (newValue === r.latest) { return }
    // ...
  }
  // ...
}
```

Now a `Reactor` will only run its effect if at least one of its inputs
changed value[^identity-equality].

-----

## Dev Tooling

When debugging the dataflow graph, we'll frequently find ourself
wondering "which `Reactor` am I looking at?", so let's add a way to
label them so we can tell them apart in the debugger.

In lieu of a more comprehensive [custom](https://devtoolstips.org/tips/en/custom-object-formatters/)
[formatter](https://firefox-source-docs.mozilla.org/devtools-user/custom_formatters/index.html),
it will suffice to just be able to see the label from the default
devtools object summary without having to click the object to expand it.

Chrome, Safari, and Firefox summarize an instance of a class by listing
the instance variables in order of definition, so let's add an instance
variable at the top of the `Reactor` definition:

```javascript
class Reactor {
  static active = null  // ← not an instance variable

  _label = undefined  // ← add this before other variables

  // ...
}
```

Now the label will show in the object summary, like this:

<img class=nostretch src="/blog/reactive-ui-part-1/screenshot-devtools-label.png">

And sometimes when doing more complex debugging, we'll need access to
the `Reactor` that powers a given `Atom` or `Calc`.

Let's modify our API primitives like so:

```javascript
export func Atom(value) {
  // ...
  atom.label = (lbl) => ((r._label = lbl), atom)
  atom.\$r = r
  return atom
}

export func Calc(fn) {
  // ...
  calc.label = (lbl) => ((r._label = lbl), calc)
  calc.\$r = r
  return calc
}
```

Now we can label a primitive at the time of creation:

```javascript
const foo = Atom(123).label('foo')
```

and access its `Reactor` by doing `foo.\$r`

-----

## That's It

That's it for the first article in the seri--- *wait!* ---we forgot the
most crucial thing! If we're going to make a library, it has to have
a clever name 😉

Let's see...

- It's small. Micro, even. `µ` is too hard to type, so **`u`** then.
- It's reactive, so it's almost obligatory to use **`rx`** in the name.
- And of course, it's Javascript isn't it? Yes, we'll have to **`.js`**.

`urx.js` --- not bad.

And it's ... *type&#x200a;type&#x200a;type* ... available on GitHub, so
-- ✔ that'll do.

<b class=semibold><a
href="https://github.com/jrpat/urx.js">https://github.com/jrpat/urx.js</a></b>

### That's Really It

Phew, that was a lot to read, but [the full
implementation](https://github.com/jrpat/urx.js/blob/main/urx-part1.js)
is actually pretty simple. In about 100 lines of easy-to-read code, we
have an ergonomic, glitch-free, performant reactive dataflow library
that robustly handles cycles, and has affordances for debugging! And you
know how it all works, from soup to nuts.

We can already use it to build real apps like the [spreadsheet
demo](/blog/reactive-ui-part-1/sheet.html) from the beginning of the
article.

But as you build with it, you'll quickly realize that it still leaves
a lot to be desired: it's not easy to combine `Atom`s into nested
structures, for example. It's a bit clunky to work with `Atom`s whose
values are lists, for another.

And we have all this derived state but no way to declaratively code our
UI, so we end up doing a lot of manual DOM manipulation (check out the
[code for the spreadsheet demo](/blog/reactive-ui-part-1/sheet.js) for
example).

We'll address all those and more in due time.

-----

## Next Up

In the next few posts in this series, we'll use `urx.js` as a foundation
on which to build:

- Larger-scale state management with nested stores that are
  automatically "react-ified", plus a few new ideas for managing state
  now that it's getting more complex
- Reactive UI rendering using batch updates ("transactions") to drive
  effecient DOM updates

-----

## Recommendations

If you liked this post, you might enjoy reading:

- [Out of the Tar Pit][tarpit]
- [Build Systems à la Carte][bs-ala-carte]

-----

Thanks for reading! See you next time.

--- *Juan*

<br>


[^libui]: Making UI development *fun* is important. If we want to build
  enjoyable things, we should enjoy working on them.<br><br>That's been
  a driving force behind many of the frameworks I've developed over the
  years. We even made it a central, explicit goal in the one I developed
  for my old company (closed-source, but I dug up the [original
  README][libui] recently) 

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
    whose action is to recompute & store its value. Or is it the other
    way around? Maybe an `Effect` is just a `Calc` whose value is always
    `undefined`.<br><br>Both are valid ways of looking at it, and in our
    implementation, in fact both are true. An `Effect` *is* just
    a `Calc`. And a `Calc` is just a "reactor" whose effect is to
    recompute and store its value.

[^atoms-dont-have-inputs]: Since `Atom`s don't depend on anything, no
    other `Atom` could possibly change.

[^gc-local-var]: By -- for example -- creating it as a local variable in
    a function and then letting it go out of scope.

[^glitches]: A "glitch" is reactive jargon for an inconsistency in
    derived state. <a class=raquo
    href="https://stackoverflow.com/a/25141234/166874">More Info</a>

[^mobx-algo]: The original idea for this algorithm comes from [this post
    about MobX][mobx-algo]. I'm sorry in advance for the color scheme 🤦

[^auto-deps-threading]: At least, that's all there is to it in
    single-threaded code. This becomes quite a bit more tricky if we're
    in a multithreaded environment.

[^identity-equality]: We use `===` equality, but it might make sense
    to use
    [same-value-zero](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#same-value-zero_equality)
    equality like many Javascript builtins do. Or perhaps we should make
    it configurable per `Reactor`.

[^cycle-hand-wave]: I know that's a bit of a hand-wavy explanation, but
    this post is long enough already. Cycle detection in a reactive
    dataflow graph is a complex topic, which perhaps I'll revisit with
    a more thorough treatment at some point in the future.

[^set-difference-shim]: It's [trivial](https://github.com/jrpat/urx.js/blob/0983095aacd1618c2f190fc1d37c77c5933023b0/urx-part1.js#L121-L131).

[tarpit]: https://curtclifton.net/papers/MoseleyMarks06a.pdf
[reactjs]: https://react.dev
[pure-function]: https://en.wikipedia.org/wiki/Pure_function
[topo-sort]: https://en.wikipedia.org/wiki/Topological_sorting
[bs-ala-carte]: https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf
[solidjs]: https://docs.solidjs.com
[mobx]: https://mobx.js.org/README.html
[mobx-algo]: https://medium.com/hackernoon/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#71b1
[libui]: https://gist.github.com/jrpat/2baafceff655b209a3432a57c8069f3c
