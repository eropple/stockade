import { Controller, FastifyInstance } from '@stockade/http';
import { LifecycleInstance, Resolver } from '@stockade/inject';

/**
 * This controller provides the underlying logic for serving OpenAPI3 documents.
 * It's not a standard HTTP controller, because it can't be; we need to be able
 * to change the location at which OAS3 documents are served and since we use
 * decorators for paths in standard Stockade controllers (and we can't really
 * parameterize those without going down a very dark hole), we can only do
 * that by coding directly against our underlying Fastify instance. Which is
 * easy enough, and `HttpFacet` provides us the `HTTP` lifecycle instance here
 * after having populated it with both `CONTROLLERS` and `SCHEMATIZER`.
 *
 * If it wasn't obvious, we're kind of committing crimes here, but they're
 * well-concealed crimes; we're programming against a known-good interface (the
 * Fastify instance) and using strongly defined data types to do our navigation
 * of the controllers in the application.
 *
 * TODO:  we should design a non-class-based controller
 *        This really demonstrates the potential value of a "controller" that's
 *        built as a static object, similar to the way that Stockade builds
 *        appSpecs, and then is hydrated at runtime into the correct Fastify
 *        routes and calls. Intuitively, something like that might then be
 *        useful for decomposing class-based controllers into something that
 *        might even be faster?
 */
@Controller()
export class OAS3Controller {
  static async onRegisterStart(fastify: FastifyInstance, resolver: Resolver) {
    const oasDocument = await resolver.resolve('OAS3_DOCUMENT');
  }
}
