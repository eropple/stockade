import { InfoObject, OpenAPIObject } from 'openapi3-ts';

export const OPENAPI3_CONFIG = Symbol.for('@stockade/oas3:OPENAPI3_CONFIG');
export type OpenAPIConfig = {
  info: InfoObject;
  modifyFn: (api: OpenAPIObject) => Promise<void>;
};
