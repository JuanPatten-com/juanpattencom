$[set meta {
  title   "Let's Build a Minimalist Reactive UI Framework"
  date    2024-03-13
}]

-----

# $[@ $meta title]

Back in 2016 I worked on a UI project built with
[ClojureScript](https://clojurescript.org), [React](https://react.dev),
and [Reagent](https://reagent-project.github.io). It featured
unidirectional data flow[^libui-unidata] with seamless data
binding[^libui-binding], fine-grained reactivity[^libui-grain], reactive
derived data[^libui-derived], and unique takes on state management
& reusable components. It was a pleasant, performant[^web-perf] way of
building UIs, and a lot of the ideas have gained popularity since
then[^solid].

When packaged all together, these frameworks can feel magical, but the
core concepts are really pretty simple. Let's unpack them and see how
simply we can build something similar.


## The Goal

While it's difficult to do these things well in a production-grade
environment, the core ideas are both fairly straightforward and
interesting.

Let's try to distill the framework into its simplest, most primitive
essence and see how simply we can implement the ideas.

> **NOTE**
>
> We are explicitly *not* building something that is
> production-ready. We are not focused on performance, or in covering
> every edge case. We're exploring to find the atomic concepts,
> then see how simply and understandably we can implement them.

```javascript
let x = 1
let y = 2
```


## Core Ideas

If you're familiar with the toolset, you might enjoy [the original
README](https://gist.github.com/jrpat/2baafceff655b209a3432a57c8069f3c),
but you won't need it to follow along.


### State Management

We were (like many others) inspired by [Out of the Tar
Pit](https://curtclifton.net/papers/MoseleyMarks06a.pdf) -- specifically
the notion of *essential* vs. *derived* state. The core of our state
management approach boiled down to:

- **One Big Dictionary**: All of the application state was
  stored in one giant dictionary, which we called the "app-db", or just
  `db`.
- **Cursors**: Essentially a pointer to some nested "path" in
  `db`. A cursor must be "dereferenced" in order to get the value of the
  data it points to, and if it is dereferenced in a certain function


## Reactive Algorithm

There are lots of names for the core primitives of reactive
frameworks. [Solid][solidjs] calls them
[`signal`](https://docs.solidjs.com/concepts/signals) and
[`memo`](https://docs.solidjs.com/concepts/derived-values/memos),
[MobX](mobxjs) calls them
[`observable`](https://mobx.js.org/observable-state.html) and
[`computed`](https://mobx.js.org/computeds.html). We're going to call
ours **`Atom`** and **`Calc`**.



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

[^solid]: I highly recommend **[Solid][solidjs]** these
  days.

[^web-perf]: For web apps, anyway 😉


[solidjs]: https://docs.solidjs.com
[mobxjs]: https://mobx.js.org/the-gist-of-mobx.html
[mobx-algo]: https://medium.com/hackernoon/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#71b1

