# `@stockade/pooled-providers` #
**This is a module for library developers only. There be dragons here.**

If you're building an application, you're probably building an application that
needs to talk to things. Most of those things are going to be on a different
computer and you're going to need to have a thing that helps you connect to it.
This thing is probably not part of Stockade, because reinventing the entire
universe would really, really suck. Instead it's probably some kind of
underlying library with its own lifecycle that you need to manage and that every
instance of a stuff-doer (an HTTP request, an event responder, whatever) gets
one of whatever that underlying library hands out as a party favor.

For a more concrete example than that sterling example of genericity: consider a
datastore like Postgres. (We actually ship TypeORM, which abstracts this, but go
with me for a second.) `node-postgres` is a completely fine library, so we'll
start there. It ships a connection pool--awesome, this should live in the
`SINGLETON` lifecycle and be shared across all our facets. (And a user who wants
a little more control for some reason can move it down to `HTTP` all on their
own!) So now we need something to pull connections out of the pool for our
`HTTP_REQUEST` lifecycle, let us do things with it, and pass it back to the
connection pool when it's done.

All of this is straightforward. You can build this right off the rack with
`@stockade/inject`. But there are a couple of things to really worry about that
made it a better idea for us to ship helpers to standardize certain behaviors.
Consider the following?

- How do I configure it?
- How do I access the good bits through the dependency injector?
- How do I allow the use of _multiple_ resource providers of the same type?
  Your users might need multiple Postgres databases, after all. Or might need
  to access their readonly replica for this or that action.

These are problems that I think it's dumb for everybody to reinvent all the
time. This package provides a one-size-hopefully-fits-most solution that we
can all use to avoid surprises.

(Also, there's an obvious question for a novice: why do we have a pool at all?
And if you noodle on it for a second--even in "non-blocking" NodeJS, it's not
totally cheap to go spin up a new database connection for every request...)

## How This Works ##
This package helps you dynamically build a module which has two invariants:

- The module is built around a check-in, check-out pool, such as `node-postgres`'s
  connection pool. For some reason, not all libraries in the Node ecosystem
  provide a pool with lifecycle-sensitive resources. I really like `generic-pool`
  for this--we use it, or will as I'm writing this ahead of time, in our Redis
  module.
- This module will be owned by a long-lived lifecycle, either `SINGLETON` or, at
  the user's option (more on that later), a specific facet's lifecycle, like
  `HTTP`.
- Short-lived child lifecycles will borrow a resource from the pool. For example,
  `HTTP` has `HTTP_REQUEST` children and needs to borrow a database connection to
  do its thing.
