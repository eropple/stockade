import 'source-map-support';

import { App, Runner } from '@stockade/core';
import { HttpApp, httpFacet } from '@stockade/http';

import { ExampleController } from './ExampleController';
import { LoggingHooks } from './LoggingHooks';

const appSpec =
  App()
    .apply(
      HttpApp()
        .hooks(LoggingHooks)
        .controllers(ExampleController),
    );

const runner = new Runner({
  appSpec,
  facets: [
    httpFacet({
      fastify: {
        listen: { port: 16000},
      },
    }),
  ],
  options: {
    logging: {
      level: 'trace',
    },
  },
});

runner.run().then(() => {
  runner.logger.info('success! (exiting)');
}).catch((err) => {
  runner.logger.error({ err }, 'failure! (exiting)');
});
