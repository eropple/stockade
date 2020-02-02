import { LoggerOptions } from '@stockade/utils/logging';

export interface IBaseOptions {
  logging?: LoggerOptions;
  skipHandlerRegistration?: boolean;
}
