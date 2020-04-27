import { InfoObject, OpenAPIObject } from 'openapi3-ts';

export const OAS3_CONFIG = Symbol.for('@stockade/oas3:OPENAPI3_CONFIG');
export type OpenAPIConfig = {
  /**
   * If true, do not serve an OAS3 document.
   */
  disabled?: boolean;

  /**
   * The path at which the OAS3 document should be served. Defaults to `/openapi.json`.
   */
  path?: string;

  /**
   * This function will be invoked at the end of the default OAS3 builder step so that
   * you can modify the document to your liking.
   */
  // tslint:disable-next-line: invalid-void
  modifyFn?: (api: OpenAPIObject) => void | Promise<void>;

  /**
   * The default, required values for the OAS3 document (title, version, etc.).
   */
  info: InfoObject;
};