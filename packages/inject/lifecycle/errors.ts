import { InjectError } from '../error';

export class ResolutionError extends InjectError {}

export class DependencyCreationError extends ResolutionError {}

export class CircularDependencyError extends DependencyCreationError {}
export class DependencyNotSatisfiedError extends DependencyCreationError {}

export class UnrecognizedProviderError extends DependencyCreationError {}
