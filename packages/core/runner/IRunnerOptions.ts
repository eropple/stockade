import { LoggerOptions } from '@stockade/utils/logging';

export interface IRunnerOptions {
  logging?: LoggerOptions;
  skipHandlerRegistration?: boolean;
}
