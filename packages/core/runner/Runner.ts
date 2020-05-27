import {
  Domain, LifecycleInstance, SINGLETON,
} from '@stockade/inject';
import { createLogger, Logger } from '@stockade/utils/logging';
import { sleepAsync } from '@stockade/utils/sleep';

import { CoreError } from '../errors';
import { FacetBase, IFacetBehavior, IFacetBuilder } from '../facets';
import { GLOBAL_LIFECYCLE } from '../global';
import { DEPENDENCY_LIFECYCLE, LOGGER } from '../inject-keys';
import { AppSpecBuilder, IAppSpec, isAppSpecBuilder } from '../spec';
import { IRunnerOptions } from './IRunnerOptions';

const RUN_WAIT_MS = 100;
const EXIT_CODE_WHEN_STOP_FAILS = 33;

export enum RunnerStatus {
  CREATED = 'created',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
}

export interface IRunnerConstructorArgs {
  appSpec: IAppSpec | AppSpecBuilder;
  facets: Array<IFacetBuilder>;
  options: IRunnerOptions;
}

export class Runner {
  #status: RunnerStatus = RunnerStatus.CREATED;
  get status() { return this.#status; }

  private readonly _baseLogger: Logger;
  readonly logger: Logger;

  readonly diDomain: Domain;
  private readonly _singletonLifecycleInstance: LifecycleInstance;

  readonly appSpec: IAppSpec;
  readonly facets: ReadonlyArray<FacetBase>;
  readonly options: IRunnerOptions;

  constructor({ appSpec, facets, options }: IRunnerConstructorArgs) {
    this.options = options;
    this._baseLogger = createLogger(this.options.logging ?? {});
    this.logger = this._baseLogger.child({ component: this.constructor.name });

    this.logger.info('Initializing runner.');

    this.appSpec = isAppSpecBuilder(appSpec) ? appSpec.build() : appSpec;

    this.diDomain = Domain.fromDefinition(this.appSpec, null);
    this._singletonLifecycleInstance =
      new LifecycleInstance(SINGLETON, GLOBAL_LIFECYCLE, this._baseLogger);
    this._singletonLifecycleInstance
      .registerTemporary(DEPENDENCY_LIFECYCLE, this._singletonLifecycleInstance)
      .registerTemporary(LOGGER, this.logger.child({ component: 'RunnerInject' }));

    this.facets = facets.map(f => f.build(
      this.logger,
      this._singletonLifecycleInstance,
      this.appSpec,
      this.diDomain),
    );
  }

  private async start(): Promise<void> {
    this.#status = RunnerStatus.STARTING;
    await Promise.all(this.facets.map(async (f) => {
      this.logger.debug({ facetClass: f.constructor.name }, `Starting '${f.constructor.name}'.`);
      await f.start();
      this.logger.debug({ facetClass: f.constructor.name }, `Started '${f.constructor.name}'.`);
    }));
    this.#status = RunnerStatus.RUNNING;
  }

  async run(): Promise<void> {
    if (this.#status !== RunnerStatus.CREATED) {
      throw new CoreError(`Can only call run() when in 'created' state. Currently: ${this.#status}`);
    }

    this.logger.info('Starting run.');
    if (!this.options.skipHandlerRegistration) { this._attachSignalEvents(); }

    this.logger.debug('Starting runner logic.');
    await this.start();
    this.logger.debug('Runner.start() returned; entering poll loop for stop.');

    // The use of `this.status` here is intentional. TypeScript doesn't understand that `this.start()`
    // has side effects, so it thinks this condition is unsatisfiable.
    //
    // TODO: is there a better way to do this kind of pause?
    while (this.status !== RunnerStatus.STOPPED) { await sleepAsync(RUN_WAIT_MS); }
  }

  async stop(): Promise<void> {
    if (this.#status !== RunnerStatus.RUNNING && this.#status !== RunnerStatus.STARTING) {
      throw new CoreError(`Can only call stop() when in 'starting' or 'running' state. Currently: ${this.#status}`);
    }

    this.logger.info('Stopping runner.');

    this.#status = RunnerStatus.STOPPING;
    await Promise.all(this.facets.map(async (f) => {
      this.logger.debug({ facetClass: f.constructor.name }, `Stopping '${f.constructor.name}'.`);
      await f.stop();
      this.logger.debug({ facetClass: f.constructor.name }, `Stopped '${f.constructor.name}'.`);
    }));
    this.#status = RunnerStatus.STOPPED;

    this.logger.debug('Cleaning up singleton lifecycle.');
    await this._singletonLifecycleInstance.cleanup();

    this.logger.info('Runner has stopped.');
  }

  /**
   * Unlike 99% of the universe, we do genuinely care about such niceties as "acting like a real UNIX
   * process".
   */
  private _attachSignalEvents() {
    this.logger.debug('Attaching signal events.');

    process.on('SIGINT', async () => {
      this.logger.info('SIGINT caught.');

      try {
        await this.stop();
      } catch (err) {
        this.logger.error({ err }, 'Error handling SIGINT. Not much to do here; bailing hard.');
        process.exit(EXIT_CODE_WHEN_STOP_FAILS);
      }
    });
    process.on('SIGTERM', async () => {
      this.logger.info('SIGTERM caught.');

      try {
        await this.stop();
      } catch (err) {
        this.logger.error({ err }, 'Error handling SIGTERM. Not much to do here; bailing hard.');
        process.exit(EXIT_CODE_WHEN_STOP_FAILS);
      }
    });

    // TODO: implement SIGHUP to force config reloads
    process.on('SIGHUP', () => {});
  }
}
