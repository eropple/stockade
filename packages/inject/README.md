# `@stockade/inject` #
This package is the dependency injector from Stockade, extracted into a separate
package to facilitate reuse. For my money, this might be the cleanest and
easiest-to-understand dependency injector in TypeScript, and I didn't want to
lock it up inside of Stockade.

## Architecture ##
The Stockade injector is an annotation-driven injection framework not unlike
Inversify. Inversify's a great library, and if it fits your needs, you should
definitely use it. However, the three goals of the Stockade injector are
difficult to implement within its confines, which is why this project exists at
all.

1.  Any code module should by default be isolated from its neighbors. While it
    may internally use dependency injection for components _within_ itself,
    allowing access to its components outside of its module should be explicitly
    permitted. (Inversify supports hierarchical DI, which can do this, but
    wrapping the API to avoid footguns is nontrivial and, as
    `inversify-components` demonstrates, unsatisfying.)
2.  As dependency export should be explicit, so should dependency _import_.
    While some modular DI systems, such as NestJS, nominate a _module_ to be
    imported, this creates high levels of coupling between modules and
    necessitates workarounds for testing (most of the `@nestjs/testing`
    namespace qualifies here) that should not be necessary. Stockade requires
    the declaration of imported _dependencies_ rather than _modules_ and allows
    a module to be agnostic as to the source of that dependency.
3.  It should be easy to define new lifecycles for an application. Stockade
    requires a singleton lifecycle at its base, but individual facets of a
    Stockade application may require their own lifecycle and yet must be able to
    cohabitate in a single process. For example, `@stockade/http` may require a
    request lifecycle for a regular web request but may also require a session
    lifecycle for the length of a websocket connection--and these should be
    configured and provisioned separately. The resolvers of lifecycles should be
    hierarchical, with a lifecycle deferring to its parent lifecycle for
    dependency resolution in the event that a dependency cannot be found
    registered to it.

To implement this, the Stockade injector defines _domains_ and _lifecycles_.

### Components ###
Components are the dependency-injected parts of `@stockade/inject`. They are
defined within _providers_, below. Any class can provide its own default
behaviors when registered via the `@AutoComponent()` decorator.

### Domains ###
A domain is a scoped set of dependencies that can be resolved against one
another. A domain may also have one parent domain from which dependencies can be
imported and into which dependencies may be exported.

Every Stockade module, including the application root, is a domain. Your
application root module may specify other modules via the `requires` property,
which makes each of those a child domain of the application root. The
interactions of these domains is defined below and reified by the test suite.

#### Children ####
Domains may have zero or more child domains. Child domains interact with their
parent domain via _exports_ and _imports_, described below.

#### Providers ####
_Providers_ declare _components_ and provide two things that create the linkage
of that component to the domain in which the provider. The provider defines the
_key_, by which a user can specify this dependency; the same key is used in
exports and imports to refer to the component provided here. The provider also
defines the _lifecycle_, which determines the scope of a given component's
creation and destruction: globally, singleton scope (within a single Stockade
web app, for example), request scope (the length of a single HTTP request),etc.

There are multiple types of providers, which provide values in different ways.

 -  A _value provider_ uses a static result and returns it.

 -  A _factory provider_ explicitly requests a set of injected components and
    calls a function, to which Stockade will pass those components as arguments.
    That function should return the component to be provided for the given key.

 -  Passing a class by itself, so long as it is decorated with
    `@AutoComponent()`, creates a _class provider_ which uses either the class
    name, or a key specified as an argument to the decorator, and will resolve
    its dependencies upon creation. (Under the hood, this actually decomposes
    into a factory provider.) You can also specify a class by a manually
    specified class provider, so as to attach a dependency-resolved component to
    a different key.

##### Dynamic Providers #####
Occasionally it's impossible to fully specify _all_ of the providers that a
given domain supports. The canonical example is an ORM exposing a CRUD
repository for a data object--that data object is user-created and attempting to
demand its specification up front is a good way to go mad. For this reason we
support the specification of a dynamic provider, of the following function type:

```
export type DynamicProviderFn =
  (d: Domain, key: symbol, lifecycle: LifecycleInstance, exported: boolean) =>
    IProviderDefinition | null | Promise<IProviderDefinition | null>;
```

This would allow a hypothetical ORM library to, then, request a connection from
the ORM (using `lifecycle.resolve()` and a dynamically changing key name), make
sure that the requested table exists, and then return the CRUD repository that
corresponds to the requested object.

As with any other provider, this will then be cached for the duration of the
current lifecycle, so this method will be called once per key/lifecycle
instance.

**Important note:** Dynamic providers are much harder to reason about and
Stockade can't help you nearly as much with regards to errors when using them.
They should be a last resort.

#### Exports ####
Exports expose components, by the name defined in their provider, to their
parent domain (which we call _modules_ in most of Stockade; _domain_ is jargon
specifically for `@stockade/inject`). Implicitly, by doing so, they are offering
to share what they are exporting with all other domains that are children of
their parent domain, as anything in the parent domain may be freely imported by
any child.

In Stockade, this is most commonly used to allow one modular bit of code to
export a component into the top level module (the _app module_) for other
aspects of the system to make use of.

#### Imports ####
Where exports expose components _to_ the parent domain, imports specify
components that are to be exposed to the current domain _from_ the parent domain
(including, again, exports from sibling domains).

### Lifecycles ###
Where domains determine what components exist and how they relate to one
another, lifecycles determine the scope of their existence and handles the
cleanup of components once their relevant period has passed. Components can be
defined with a set of lifecycles in which they may be instantiated; a component
can be defined in any lifecycle that is so nominated _or_ in their parent
lifecycle. For example, a component instantiated in the request lifecycle of
`@stockade/http` may rely on any components instantiated during _that_ request
lifecycle (for example, the content of the request itself being injected into a
web controller) or in its parent lifecycle, the singleton lifecycle (a database
connection or other long-lived resource).

Lifecycles track objects instantiated within their bounds and components can
elect to implement cleanup methods that are invoked when the lifecycle is ending
(e.g., after a request has been sent to a client).

`@stockade/inject` defines two lifecycles, `GLOBAL` and `SINGLETON`. These are
to be standardized across all Stockade application facets (web, CLI, and task);
`GLOBAL` applies to an entire process, while `SINGLETON` applies only to a
single instance of the Stockade runner. For most use cases, this should be
equivalent, as having multiple runners in a single process is probably
head-scratching, but this also makes writing tests easier to immediately parse
at a glance.

#### Custom Lifecycles ####
Unlike every other NodeJS dependency injection framework of which I am aware,
building lifecycles that map to whatever you're working on is easy. Define an
interface of type `ILifecycle` and specify a parent as appropriate. You can now
use that lifecycle as appropriate.

This is actually how the various facets of Stockade implement providers that are
only invoked when the application is run in this or that mode; for example,
`@stockade/http` uses the following lifecycle hierarchy:

```
GLOBAL --> SINGLETON --> HTTP --> REQUEST (the lifespan of an HTTP request)
                              \-> WS_SESSION (the lifespan of a WebSocket)
```

A service or resource that must be generally available, then, can live in the
default `SINGLETON` lifecycle; if it must _only_ run when there's an HTTP server
in the mix, it can then live in the `HTTP` lifecycle (and thus, transitively, be
available to code running in the `REQUEST` or `WS_SESSION` lifecycles).
