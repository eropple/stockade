# `@stockade/core` #
This package defines the central, shared abstractions in Stockade. It
incorporates the dependency injection framework provided by
`@stockade/inject` and uses it to bootstrap core services that will be
used by individual systems, termed _facets_, within a Stockade application.

For example: all Stockade applications can expect to find a `LOGGER` key
in the `SINGLETON` lifecycle (which will be provided by this package). On
the other hand, something like the `@stockade/http` facet may redefine
`LOGGER` in the `REQUEST` lifecycle to personalize it for a particular
session with a request ID or the like.
