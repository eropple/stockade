import {
  LifecycleInstance, SINGLETON,
} from '@stockade/inject';
import { createLogger, Logger } from '@stockade/utils/logging';
import { sleepAsync } from '@stockade/utils/sleep';

import { CoreError } from '../errors';
import { GLOBAL_LIFECYCLE } from '../global';
import { AppSpecBuilder, IAppSpec, isAppSpecBuilder } from '../spec';
import { IBaseOptions } from './IBaseOptions';
import { IRunnerBehavior } from './IRunnerBehavior';

const RUN_WAIT_MS = 100;
const EXIT_CODE_WHEN_STOP_FAILS = 33;

export enum RunnerStatus {
  CREATED = 'created',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
}

export abstract class BaseRunner<
  TOptions extends IBaseOptions,
> {
  private _status: RunnerStatus = RunnerStatus.CREATED;
  get status() { return this._status; }

  private readonly _baseLogger: Logger;
  private readonly _logger: Logger;
  get logger() { return this._logger; }

  private readonly _singletonLifecycle: LifecycleInstance;
  /**
   * The lifecycle that represents the core DI cycle for the application. While
   * components can use the `SINGLETON` lifecycle, the lifecycle here is the one
   * that indicates that the application is running in the context of a particular
   * runner (HTTP, task, CLI, etc.).
   */
  protected readonly lifecycle: LifecycleInstance;

  readonly appSpec: IAppSpec;

  constructor(
    behavior: IRunnerBehavior,
    appSpec: IAppSpec | AppSpecBuilder,
    protected readonly options: TOptions,
  ) {
    this._baseLogger = createLogger(this.options.logging ?? {});
    this._logger = this._baseLogger.child({ component: this.constructor.name });

    this._logger.info('Initializing base runner.');

    this.appSpec = isAppSpecBuilder(appSpec) ? appSpec.build() : appSpec;

    this._singletonLifecycle =
      new LifecycleInstance(SINGLETON, GLOBAL_LIFECYCLE, this._baseLogger);
    this.lifecycle =
      new LifecycleInstance(behavior.baseLifecycle, this._singletonLifecycle, this._baseLogger);
  }

  protected abstract async doStart(): Promise<any>;
  protected abstract async doStop(): Promise<any>;

  private async start(): Promise<void> {
    this._status = RunnerStatus.STARTING;
    await this.doStart();
    this._status = RunnerStatus.RUNNING;
  }

  async run(): Promise<void> {
    if (this._status !== RunnerStatus.CREATED) {
      throw new CoreError(`Can only call run() when in 'created' state. Currently: ${this._status}`);
    }

    this._logger.info('Starting run.');
    if (!this.options.skipHandlerRegistration) { this._attachSignalEvents(); }

    this._logger.debug('Starting runner logic.');
    await this.start();
    this._logger.debug('Runner.start() returned; entering poll loop for stop.');

    // The use of `this.status` here is intentional. TypeScript doesn't understand that `this.start()`
    // has side effects, so it thinks this condition is unsatisfiable.
    //
    // TODO: is there a better way to do this kind of pause?
    while (this.status !== RunnerStatus.STOPPED) { await sleepAsync(RUN_WAIT_MS); }
  }

  async stop(): Promise<void> {
    if (this._status !== RunnerStatus.RUNNING && this._status !== RunnerStatus.STARTING) {
      throw new CoreError(`Can only call stop() when in 'starting' or 'running' state. Currently: ${this._status}`);
    }

    this._logger.info('Stopping runner.');

    this._status = RunnerStatus.STOPPING;
    await this.doStop();
    this._status = RunnerStatus.STOPPED;

    this._logger.info('Runner has stopped.');
  }

  /**
   * Unlike 99% of the universe, we do genuinely care about such niceties as "acting like a real UNIX
   * process".
   */
  private _attachSignalEvents() {
    this._logger.debug('Attaching signal events.');
    process.on('SIGINT', async () => {
      this._logger.info('SIGINT caught.');

      try {
        await this.stop();
      } catch (err) {
        this._logger.error({ err }, 'Error handling SIGINT. Not much to do here; bailing hard.');
        process.exit(EXIT_CODE_WHEN_STOP_FAILS);
      }
    });
    process.on('SIGTERM', async () => {
      this._logger.info('SIGTERM caught.');

      try {
        await this.stop();
      } catch (err) {
        this._logger.error({ err }, 'Error handling SIGTERM. Not much to do here; bailing hard.');
        process.exit(EXIT_CODE_WHEN_STOP_FAILS);
      }
    });

    // TODO: implement SIGHUP to force config reloads
    process.on('SIGHUP', () => {});
  }
}
