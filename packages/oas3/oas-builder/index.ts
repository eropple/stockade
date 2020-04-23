import { InfoObject, OpenAPIObject } from 'openapi3-ts';

// This could be an injected class but I don't want to poison the namespace
// with it; we only ever
export class OASBuilder {
  constructor(
    private readonly info: InfoObject,
  ) {}

  async build(controllers: any): Promise<OpenAPIObject> {
    const doc: OpenAPIObject = {
      openapi: '3.1',
      info: this.info,
      paths: {},
    };

    return doc;
  }
}
