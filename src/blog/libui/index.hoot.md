$[set meta {
  title   "Let's Build a Reactive UI Framework"
  date    2024-03-13
}]

-----

# $[@ $meta title]

```
{{ WRITE AN INTRO }}
```

## Derived Data, Flowing

Let's start by thinking about the fundamental building blocks of our
system. To borrow some [popular terminology][tarpit], we have 2 basic
types of data:

- __*Input data*__ are facts that aren't reducible to some other
  facts. In the canonical "rectangle" example, the rectangle's
  `width` and `height` are input data. We need to persist this data
  (ie. store it in a database) because we can't derive it later.
- __*Derived data*__ is everything we can calculate based on the input
  data. The rectangle's area, for example is <code class=eqn>width
  × height</code>. Its diagonal is <code
  class=eqn>sqrt(width<sup>2</sup> + height<sup>2</sup>)</code>. We
  don't need[^real-world-caching] to store these things because we can
  calculate them from the input data at any time.

The goal of a reactive system is to only store and modify input
data. Then when we change the input data, everything else should
automatically reflect the change. That is, everything *flows* from the
input data.

Notably, <b class=semibold>*the entire user interface is derived
data*</b>. This is the core idea of [React][reactjs] et al. If this
seems obvious to you, skip the following examples.

<details>
<summary>Example 1</summary>
<p>
Think of filling out a form. The form fields are input
data. Whether they are valid is derived data, and whether the UI is
showing a validation error is also derived data. When the form inputs
change, the UI should change along with it, automatically.
</p>
</details>

<details>
<summary>Example 2</summary>
<p>
The most visceral example is a spreadsheet. Reactive framework people
want all UIs to work like spreadsheets. Some cells are just numbers
(ie. <em>input</em>), and some are equations which reference other cells
(ie. <em>derived</em>). When one of the input cells is updated, all the
cells that are derived from that cell update automatically.
</p>
</details>

## Terminology

There are as many names for these 2 building blocks as there are
reactive libraries. Solid calls them "signal" and "memo". MobX calls
them "observable" and "computed". We're going to call them:

- Input data will be **`Atom`** because it's "atomic": irreducible to
  any other thing. Though really I just stole the name from
  Lisp[^lisp-atom].
- **`Calc`** - derived data. Named because it's `calc`ulated from the
  input data. And because it has the same number of
  letters. [Symmetry](https://store.doverpublications.com/products/9780486217765)!

An `Atom` and a `Calc` are both types of __*datum*__, which we define
because it's more convenient than typing "`Atom` or `Calc`" every time.

If a `Calc` references a datum, we say that it __*tracks*__ that datum,
and whenever the tracked value changes, the `Calc` will re-calculate.

As `Calc`s depend on other `Calc`s, which in turn depend on other
`Calc`s and `Atom`s, we are forming a __*dependency
[graph](https://en.wikipedia.org/wiki/Graph_(abstract_data_type))*__.


## The Library

OK, with that out of the way, let's start designing our library. Step
1 -- Crucial: What should we call it?

Hmmmmm... hrmmmm.... hrrrrrmmmmmm... 🤔

- It'll be small. Small... microscopic... micro... **`μ`**_!_
- It'll be reactive. Reactive... reaction... **`rxn`**_!_
- It'll be in Javascript. This one's easy... **`.js`**

Introducing **`μrxn.js`**: a small, reac--- Say what? Too
hard to type? Weird mouth feel? Right. Hmmm.... hrmmmmm... hrrrmm---
I've got it!

How about **`urx.js`**?

...*checks GitHub*...

[That'll do, pig. That'll do.](https://www.youtube.com/watch?v=rjQtzV9IZ0Q)

## The API

Let's start by designing the API. What will it feel like to use
`urx.js`?

### Atom

Creating an `Atom` is simple. We start with an initial value:

```javascript
let x = Atom(5)
```

To change an `Atom`'s value, we can either set it directly:

```javascript
x.set(10)  // x() == 10
```

or apply a function to its current value:

```javascript
x.update(x => x * 2)  // x() == 20
```

To get the current value of an `Atom`'s, we call it like
a function[^atom-is-a-function]:

```javascript
let currentValueOfX = x()  // 20
```

Anything that 

<details>
<summary>...almost.</summary>
<p>
We also need to be able to <code>dispose()</code> an
<code>Atom</code>. More on that in a moment&hellip;
</p>
</details>

#### Implementation

Let's sketch out an outline of the implementation of `Atom`:

```javascript
function Atom(value) {
  const getter = () => { /* ... */ }
  getter.peek = () => pub.latest
  getter.set = (newValue) => {
    if (newValue == pub.latest) { return }
    pub.stale()
    pub.latest = newValue
    pub.fresh(true)
  }
  getter.update = (fn) => {
    getter.set(fn(pub.latest))
  }
  getter.dispose = () => pub.dispose()
  return getter
}

```

### Calc

A `Calc` is just a function that references an `Atom` or another `Calc`:

```javascript
let xSquared = Calc(() => x() ** 2)
```

Notice that this `Calc` __*tracks*__ the value of the `Atom` we created
earlier.

To get the current value of a `Calc`, we call it like
a function[^calc-is-a-function]:

```javascript
let currentValueOfXSquared = xSquared()  // => 400
```


## The Algorithm

The basic procedure for recalculating the tree goes in two phases:

1. Phase 1 is figuring out every `Calc`[^atoms-dont-have-inputs] which
   could possibly change based on the `Atom`'s new value and labelling
   them __*stale*__. We also label `Atom` itself stale.
2. Phase 2 is figuring out the order in which to recalculate. A `Calc`
   may be re&shy;calculated if -- and *only* if -- *all* of its
   dependencies are __*fresh*__ (ie. not stale).


-----

If you liked this post, you might be interested in:

- [Build Systems à la Carte](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf)

-----

[^real-world-caching]: Though in practice, some derived data is so
    expensive to calculate that we end up caching it.

[^lisp-atom]: Or more specifically in this case,
    [Clojure](https://clojuredocs.org/clojure.core/atom) and
    [Reagent](http://reagent-project.github.io/docs/master/reagent.ratom.html#var-atom).

[^atom-is-a-function]: Because it *is* a function.
[^calc-is-a-function]: Because it *is* a function.

[^atoms-dont-have-inputs]: Since `Atom`s don't depend on anything, no
    other `Atom` could possibly change.

-----

[tarpit]: https://curtclifton.net/papers/MoseleyMarks06a.pdf
[reactjs]: https://react.dev
