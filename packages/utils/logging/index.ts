import * as Pino from 'pino';

import { envOrFallback } from '../env';

/**
 * The standard logger type for Stockade. Under the hood, this
 * is Pino, but that's an implementation detail.
 */
export type Logger = Pino.Logger;

/**
 * Custom logger options. Actually `Pino.LoggerOptions`...and this
 * is, unfortunately, less of just an implementation detail.
 */
export type LoggerOptions = Pino.LoggerOptions;

// tslint:disable-next-line: no-magic-numbers
export const createLogger = (opts: LoggerOptions) => Pino.default(opts, Pino.destination(2));

/**
 * For ease of testing, etc., it's often better to shut up our test
 * suite than to mess around with injecting a logger. Application
 * startup will require the specification of a logger, which will
 * ensure that this gets dealt with there.
 *
 * This is called `FallbackLogger` instead of `SilentLogger` because
 * it can be really helpful to increase its verbosity when testing.
 */
export const FallbackLogger: Logger = createLogger({
  level: envOrFallback('STOCKADE_UTILS_FALLBACK_LOGGER_LEVEL', 'silent'),
});

