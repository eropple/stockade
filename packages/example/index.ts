import { App, AppSpecBuilder, IModule, Module, ModuleBuilder } from '@stockade/core';
import { HttpRunner } from '@stockade/http';

const m: IModule;
m.controllers = undefined;

const app =
  App()
    .children(
      Module('foo')
        .build(),
    )
    .build();

const runner = new HttpRunner(app, {});
runner.run().then(() => {
  runner.logger.info('success! (exiting)');
}).catch((err) => {
  runner.logger.error({ err }, 'failure! (exiting)');
});
