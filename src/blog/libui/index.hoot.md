$[set meta {
  title   "Let's Build a Reactive UI Framework"
  date    2024-03-13
}]

-----

# $[@ $meta title]

```
{{ WRITE AN INTRO }}
```

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

The goal of a "reactive" framework is to make it so the only mutable
state we need in our system is input data. When we make changes to the
input data, all the derived data should automatically update to reflect
the change. That is, everything *flows* from the input data.

In particular, <b class=semibold>*the entire user interface is derived
data*</b>. This is the core idea of frameworks like [React][reactjs]
when they say "UI is a pure function of state".

## The Jargon

There are as many names for these building blocks as there are reactive
libraries. Solid calls them "signal" and "memo". MobX calls them
"observable" and "computed". We're going to call them:

- **`Atom`** -- input data -- because it's "atomic": irreducible to
  any other thing.[^lisp-atom]
- **`Calc`** -- derived data -- because it's `calc`ulated from the
  input data.[^symmetry]

`Atom` and a `Calc` are both a kind of __*datum*__, which we define
because it's more convenient than typing "`Atom` or `Calc`" every time.

If a `Calc` uses the value of a datum, we say that it __*tracks*__ that
datum. Whenever the tracked value changes, the `Calc` will automatically
re-calculate.

If datum `Child` tracks datum `Parent`, we say that `Child` is
a __*dependent*__ of `Parent`, and that `Parent` is
a __*dependency*__ of `Child`.

As `Calc`s depend on other `Calc`s, which in turn depend on other
`Calc`s and `Atom`s, we are forming a __*[dependency
graph](https://en.wikipedia.org/wiki/Dependency_graph)*__.


## The Library

Let's sketch out how we might turn these ideas into a library. First
we'll sketch out the API we want to expose, and then we'll think about
how we might implement it.

### API

#### Atom

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
x.update(x => x * 2)  // x's value is 20
```

To get the current value of an `Atom`, we call it like a function:

```javascript
x()  // => 20
```

If a `Calc` gets the value of an `Atom`, it *tracks* that `Atom`. This
is usually what we want, but if we want to look without tracking, we can
*peek*:

```javascript
x.peek()  // => 20
```

That's all for `Atom`.[^atom-dispose]

#### Calc

A `Calc` is just a function. Ideally a [pure function][pure-function]:

```javascript
let xSquared = Calc(() => x() ** 2)
```

<sup>Notice that this `Calc` __*tracks*__ the value of the `Atom` we created
earlier.</sup>

To get the current value of a `Calc`, we call it like
a function:

```javascript
xSquared()  // => 400
```

`Calc`s can track other `Calc`s:

```javascript
let xSquaredPlus2 = (() => xSquared() + 2)
```

Like `Atom`s, we can peek at `Calc`s without tracking them:

```javascript
xSquaredPlus2.peek()  // => 402
```

Since we can't change the value of a `Calc` directly, that's all for
`Calc`.[^calc-dispose]

#### Effect

An `Effect` is like a `Calc`, but instead of calculating a new value
when a datum changes, an effect *does something* when a datum changes:
logs to the console, makes a network request, updates the UI, etc...

An `Effect` is just a function:

```javascript
let logger = Effect(() => console.log(`x == \${x()}`))
```

<details>
<summary>Wait, so is <code>Calc</code> just a special case of
<code>Effect</code>&hellip;</summary>
<p>
&hellip; whose action is to recompute & store its value.
Or is it the other way around? Maybe an <code>Effect</code> is just
a <code>Calc</code> whose value is always <code>undefined</code>.
</p>
<p>
Both are valid ways of looking at it, but in our implementation the
latter is actually true. And that comes with a benefit: we can easily
model serial processes via cascading <code>Effect</code>s.
</p>
</details>


### Implementation

`Atom`, `Calc`, and `Effect` are the most primitive parts of our API,
but notice that they share some functionality:

- `Atom` and `Calc` can both "publish" changes to their dependents.
- `Calc` and `Effect` can both "subscribe" to changes from their
  dependencies.

This implies there's something more fundamental at work: some kind of
"[publish-subscribe](https://en.wikipedia.org/wiki/Publish–subscribe_pattern)"
mechanism. Let's keep this in mind.


## The Algorithm

Now that we've got the basic API, we need to figure out how to do the
"reactive" part. Essentially, when an `Atom` is changed, we need to
figure out two things:

1. Every `Calc`[^atoms-dont-have-inputs] that could possibly change
   based on the `Atom`'s new value. We'll call these __*stale*__.
2. The order in which to recalculate. A `Calc` may recalculate if -- and
   *only if* -- *all* of its dependencies are __*fresh*__ (ie. not
   stale).

#1 is fairly straightforward in our framework. Each datum keeps track
of both its dependencies and its dependents. So the changed `Atom` knows
which `Calc`s depend on it, and those `Calc`s know which ones depend on
them, and so forth.

There are a number of ways to figure out #2. Some frameworks do
a [topological sort][topo-sort] keep the 


Here's how we'll implement this procedure:

1. When we tell an `Atom` to change its value, it will first notify all
   its dependents that it is `stale`. They will in turn notify all their
   dependents, and so forth. When this is done, every datum that could
   possibly be affected by this change will be marked stale.
2. Each datum will keep track of how many of its 
2. The `Atom` will store its new value, and then notify all its
   depenents that it is `fresh`.

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

[^lisp-atom]: And because I stole it from Lisp -- specifically in this
    case [Clojure](https://clojuredocs.org/clojure.core/atom) and
    [Reagent](http://reagent-project.github.io/docs/master/reagent.ratom.html#var-atom).

[^symmetry]: And it's the same number of
    letters. [Symmetry](https://store.doverpublications.com/products/9780486217765)!

[^atom-dispose]: Almost. We also need to be able to `dispose()` of an
    `Atom`, but we'll get to that later.

[^calc-dispose]: Almost. We also need to be able to `dispose()` of
    a `Calc`, but we'll get to that later.

[^effect-dispose]: Almost. We also need to be able to `dispose()` of an
    `Effect`, but we'll get to that later.

[^atoms-dont-have-inputs]: Since `Atom`s don't depend on anything, no
    other `Atom` could possibly change.

-----

[tarpit]: https://curtclifton.net/papers/MoseleyMarks06a.pdf
[reactjs]: https://react.dev
[pure-function]: https://en.wikipedia.org/wiki/Pure_function
[topo-sort]: https://en.wikipedia.org/wiki/Topological_sorting
