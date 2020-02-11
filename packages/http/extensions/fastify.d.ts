import { LifecycleInstance } from '@stockade/inject';
declare module 'fastify' {
    interface FastifyRequest<HttpRequest, Query, Params, Headers, Body> {
        $stockade: {
            lifecycleInstance: LifecycleInstance;
        };
    }
}
