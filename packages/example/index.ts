import { App } from '@stockade/core';
import { HttpRunner } from '@stockade/http';

const app =
  App()
    .build();

const runner = new HttpRunner(app, {});
runner.run().then(() => {
  runner.logger.info('success! (exiting)');
}).catch((err) => {
  runner.logger.error({ err }, 'failure! (exiting)');
});
