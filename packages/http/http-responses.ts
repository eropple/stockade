// TODO: remove this dependency
import { getStatusText } from 'http-status-codes';

import { StringTo } from '@stockade/utils/types';

import { HttpStatus } from './http-statuses';

export class HttpResponse extends Error {
  readonly body: StringTo<any>;

  constructor(
    readonly code: HttpStatus,
    messageOrBody: StringTo<any> | string = getStatusText(code),
  ) {
    super(messageOrBody === 'string' ? messageOrBody : JSON.stringify(messageOrBody));

    this.body =
      typeof(messageOrBody) === 'string'
        ? { error: messageOrBody }
        : messageOrBody;
  }
}

export class TemporaryRedirect extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.TEMPORARY_REDIRECT, message);
  }
}

export class PermanentRedirect extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.PERMANENT_REDIRECT, message);
  }
}

export class MovedTemporarily extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.MOVED_TEMPORARILY, message);
  }
}

export class MovedPermanently extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.MOVED_PERMANENTLY, message);
  }
}

export class BadRequestResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.BAD_REQUEST, message);
  }
}

export class ConflictResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.CONFLICT, message);
  }
}

export class FailedDependencyResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.FAILED_DEPENDENCY, message);
  }
}

export class ForbiddenResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.FORBIDDEN, message);
  }
}

export class UnauthorizedResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.UNAUTHORIZED, message);
  }
}

export class GoneResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.GONE, message);
  }
}

export class TeapotResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.IM_A_TEAPOT, message);
  }
}

export class InsufficientSpaceOnResourceResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.INSUFFICIENT_SPACE_ON_RESOURCE, message);
  }
}

export class InternalServerErrorResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message);
  }
}

export class LockedResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.LOCKED, message);
  }
}

export class NotFoundResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.NOT_FOUND, message);
  }
}

export class NotImplementedResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.NOT_IMPLEMENTED, message);
  }
}

export class PreconditionFailedResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.PRECONDITION_FAILED, message);
  }
}

export class PreconditionRequiredResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.PRECONDITION_REQUIRED, message);
  }
}

export class RequestRangeNotSatisfiableResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, message);
  }
}

export class TooManyRequestsResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.TOO_MANY_REQUESTS, message);
  }
}

export class UnprocessableEntityResponse extends HttpResponse {
  constructor(message?: string) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message);
  }
}

