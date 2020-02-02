import { BaseRunner } from '@stockade/core/runner';

import { IHttpOptions } from './IHttpOptions';

export class HttpRunner extends BaseRunner<IHttpOptions> {
  protected doStart(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  protected doStop(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
