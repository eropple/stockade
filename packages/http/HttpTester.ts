import { FastifyRequest, HTTPInjectOptions, HTTPInjectResponse } from 'fastify';

import { Runner } from '@stockade/core';
import { StringTo } from '@stockade/utils/types';

import { HttpFacetError } from './errors';
import { HttpFacet, isHttpFacet } from './facet';

export type HttpTestResponse = HTTPInjectResponse & { json: () => (StringTo<any>) };

export class HttpTester {
  private readonly httpFacet: HttpFacet;

  constructor(
    private readonly runner: Runner,
  ) {
    const httpFacet: HttpFacet | undefined = runner.facets.find<HttpFacet>(isHttpFacet) ;
    if (!httpFacet) {
      throw new HttpFacetError('Could not find an HttpFacet in the runner being tested.');
    }

    this.httpFacet = httpFacet;
  }

  async inject(opts: HTTPInjectOptions): Promise<HttpTestResponse> {
    // TODO: is there a cleaner way to do this? Does Fastify need better types?
    return (this.httpFacet.fastify.inject(opts) as unknown) as HttpTestResponse;
  }
}
