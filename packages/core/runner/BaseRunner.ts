import { IRunnerBehavior } from 'IRunnerBehavior';

import {
  IDomainDefinition, LifecycleInstance, SINGLETON,
} from '@stockade/inject';
import { createLogger, FallbackLogger, Logger } from '@stockade/utils/logging';
import { sleepAsync } from '@stockade/utils/sleep';

import { CoreError } from '../errors';
import { GLOBAL_LIFECYCLE } from '../global';
import { IBaseOptions } from '../IBaseOptions';

export const RUN_WAIT_MS = 100;

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

  private readonly _singletonLifecycle: LifecycleInstance;
  /**
   * The lifecycle that represents the core DI cycle for the application. While
   * components can use the `SINGLETON` lifecycle, the lifecycle here is the one
   * that indicates that the application is running in the context of a particular
   * runner (HTTP, task, CLI, etc.).
   */
  protected readonly lifecycle: LifecycleInstance;

  constructor(
    behavior: IRunnerBehavior,
    readonly appSpec: any,
    protected readonly options: TOptions,
  ) {
    this._baseLogger = createLogger(this.options.loggerOptions);
    this._logger = this._baseLogger.child({ component: this.constructor.name });

    this._logger.info('Initializing base runner.');

    this._singletonLifecycle =
      new LifecycleInstance(SINGLETON, GLOBAL_LIFECYCLE, this._baseLogger);
    this.lifecycle =
      new LifecycleInstance(behavior.baseLifecycle, this._singletonLifecycle, this._baseLogger);
  }

  protected abstract async doStart(): Promise<void>;
  protected abstract async doStop(): Promise<void>;

  private async start(): Promise<void> {
    this._status = RunnerStatus.STARTING;
    await this.doStart();
    this._status = RunnerStatus.RUNNING;
  }

  async run(): Promise<void> {
    if (this._status !== RunnerStatus.CREATED) {
      throw new CoreError(`Can only call run() when in 'created' state. Currently: ${this._status}`);
    }

    await this.start();

    // The use of `this.status` here is intentional. TypeScript doesn't understand that `this.start()`
    // has side effects, so it thinks this condition is unsatisfiable.
    while (this.status !== RunnerStatus.STOPPED) { await sleepAsync(RUN_WAIT_MS); }
  }

  async stop(): Promise<void> {
    if (this._status !== RunnerStatus.RUNNING && this._status !== RunnerStatus.STARTING) {
      throw new CoreError(`Can only call stop() when in 'starting' or 'running' state. Currently: ${this._status}`);
    }

    await this.doStop();
    this._status = RunnerStatus.STOPPED;
  }
}
