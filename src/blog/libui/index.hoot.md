$[set meta {
  title   "Let's Build a Minimalist Reactive UI Framework"
  date    2024-03-13
}]

-----

# $[@ $meta title]

A while ago I worked on a UI project built with
[ClojureScript](https://clojurescript.org), [React](https://react.dev),
and [Reagent](https://reagent-project.github.io). It featured
unidirectional data flow[^libui-unidata] with seamless data
binding[^libui-binding], fine-grained reactivity[^libui-grain], reactive
derived data[^libui-derived], and unique takes on state management
& reusable components[^libui-state]. It was a pleasant[^libui-readme],
performant way of building UIs, and a lot of the ideas have gained
popularity since then[^solid].

When packaged all together, these frameworks can feel magical, but the
core concepts are really pretty simple. Let's unpack them and see how
simply we can build something similar.


## What We're Building

A lot of reactive approaches can trace their roots back to the classic
paper [Out of the Tar Pit][tarpit], which lays out two classes of data:

- **Input** data, which must be provided explicitly. This data *must be
  stored* in some kind of database, because we can't recalculate it
  later.
- **Derived** data, which is anything we can caclulate from the input
  data. We do not need[^derived-cache] to store this data because it can
  be derived from the input data.

Correspondingly, most reactive systems define primitives that align with
these classes. Solid calls them "signal" & "memo". MobX calls them
"observable" & "computed". We're going to call ours **`Atom`** and
**`Calc`**.

We want the derived data to automatically update any time the input data
changes. We'll call this "reactivity".


## Reactivity

We're going to build our system on two even more fundamental building
blocks: a `Publisher` which has some value, and a `Subscriber`, which
can register to be notified when that value changes.




-----

If you liked this post, you might be interested in:

- [Build Systems à la Carte](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf)



[^libui-unidata]: State could only be updated via "commands" -- pure
  functions that take in the current state and return a new
  state. Clojure's immutability makes this feel a lot more like
  imperative programming.

[^libui-binding]: This might seem like a contradiction to the above, but
  it's not. Read on...

[^libui-grain]: Components update only when absolutely necessary --
  ie. when state that they depend on changes.

[^libui-derived]: Components can not only depend on stored state, but
  also on the result of functions which in turn depend on stored state
  or other reactive functions.

[^libui-readme]: If you're familiar with the toolset, you might enjoy
  [the original
  README](https://gist.github.com/jrpat/2baafceff655b209a3432a57c8069f3c),
  but you won't need it to follow along.

[^libui-state]: We stored all application state in **one big
  dictionary**, which we called the "app-db", or just `db`. Different
  parts of the state could be isolated using "cursors", which could be
  passed into reusable components so they could modify app state without
  knowing anything about its structure.

[^solid]: I highly recommend **[Solid][solidjs]** these
  days.

[^derived-cache]: Though sometimes it's cached for performance reasons.


[solidjs]: https://docs.solidjs.com
[mobxjs]: https://mobx.js.org/the-gist-of-mobx.html
[mobx-algo]: https://medium.com/hackernoon/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#71b1
[tarpit]: https://curtclifton.net/papers/MoseleyMarks06a.pdf

