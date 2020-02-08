import { App, Module } from '@stockade/core';
import { Http, HttpApp, HttpRunner } from '@stockade/http';

const app =
  App()
    .children(
      Module('foo')
        .apply(
          Http(),
        ),
    )
    .apply(
      HttpApp(),
    );

const runner = new HttpRunner(app, {});
runner.run().then(() => {
  console.log(runner.appSpec);
  runner.logger.info('success! (exiting)');
}).catch((err) => {
  runner.logger.error({ err }, 'failure! (exiting)');
});
