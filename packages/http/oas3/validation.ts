import { OpenAPIObject } from 'openapi3-ts';

// tslint:disable-next-line: no-var-requires
const Enforcer = require('openapi-enforcer');

export interface IOAS3ValidationResults {
  errors?: Error;
  warnings?: Error;
}

export async function validateDocument(doc: OpenAPIObject): Promise<IOAS3ValidationResults> {
  const { errors, warnings } = await Enforcer(doc, { fullResult: true });

  return { errors, warnings };
}
