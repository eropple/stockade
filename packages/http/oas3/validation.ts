import { OpenAPIObject } from 'openapi3-ts';

// tslint:disable-next-line: no-var-requires
const Enforcer = require('openapi-enforcer');

export interface IOAS3ValidationResults {
  errors?: Error;
  warnings?: Error;
}

export async function validateDocument(doc: OpenAPIObject): Promise<IOAS3ValidationResults> {
  // openapi-enforcer is a bit overly zealous with regards to the document
  //
  const d = JSON.parse(JSON.stringify(doc));
  const result = await Enforcer(d, { fullResult: true });

  return { errors: result.error, warnings: result.warning };
}
