import { App, Runner } from '@stockade/core';

import { httpFacet } from '../facet';
import { HttpApp } from '../http-builder';

describe('simple HTTP tests', () => {
  it('should construct an empty app safely', () => {
    const runner = new Runner({
      appSpec:
        App()
          .apply(
            HttpApp()
            ),
      facets: [
        httpFacet(),
      ],
      options: { logging: { level: 'warn' } },
    });
  })
})
