$[set meta {
  title   "Let's Build a Minimalist Reactive UI Framework"
  date    2024-03-13
}]

-----

# $[@ $meta title]

Back in 2016 I worked on a UI project built with
[ClojureScript](https://clojurescript.org), [React](https://react.dev),
and [Reagent](https://reagent-project.github.io). It featured:

- **Unidirectional data flow**: State can only be updated via "commands"
  -- pure functions that take in current state and return a new state.
- **Seamless data binding**: Not a contradiction with the above point.
- **Fine grained reactivity**: Components update only when absolutely
  necessary -- ie. when state that they depend on changes.
- **Derived data, flowing**: Components can not only depend on stored
  state, but also on the result of functions which in turn depend on
  stored state or other reactive functions.
- **Reusable components** that can modify isolated islands of
  application state without knowing anything about its structure.

A lot of the ideas and techniques we used have gained popularity since
then, and recently **[Solid](https://docs.solidjs.com)** combines many
of the same core ideas into a very similar development
experience. I recommend checking it out.

I wanted to highlight a few of the more unique aspects of the system,
and try to build something similar in a small-scale, understandable way.


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

While many reactive frameworks are built around "observers" and
"derivations", we're going to build ours on two core primitives:
**Publisher** and **Subscriber**.




-----

If you liked this post, you might be interested in:

- [Build Systems à la Carte](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf)



