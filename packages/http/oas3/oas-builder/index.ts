import { InfoObject, OpenAPIObject, OperationObject } from 'openapi3-ts';

import { IMappedController, IMappedEndpointDetailed } from '@stockade/http';
import { SchematizedDocumentInstance, Schematizer } from '@stockade/schemas';

import { OAS3Controller } from '../oas3.controller';

// classes, poor man's closures, etc.
export class OASBuilder {
  private readonly schematizerInstance: SchematizedDocumentInstance;

  constructor(
    schematizer: Schematizer,
  ) {
    this.schematizerInstance = schematizer.makeDocumentInstance('#/components/schemas');

  }

  async build(
    controllers: ReadonlyArray<IMappedController>,
    info: InfoObject,
  ): Promise<OpenAPIObject> {
    const doc: OpenAPIObject = {
      openapi: '3.1',
      info,
      paths: {},
      components: {},
    };

    this.schematizerInstance.insertSchemasIntoObject(doc);

    for (const controllerInfo of controllers) {
      if (controllerInfo.controller === OAS3Controller) { continue; }

      // TODO:  can we parallelize this?
      //        Yes, Node is single-threaded, etc., but some user configurable
      //        stuff can be done asynchronously and so I'd be worried about
      //        stomping on our shared `doc` object.
      await this._processController(doc, controllerInfo);
    }

    return doc;
  }

  private async _processController(doc: OpenAPIObject, controllerInfo: IMappedController): Promise<void> {
    for (const endpointInfo of Object.values(controllerInfo.endpoints)) {
      const operation = await this._processEndpoint(controllerInfo, endpointInfo);
      // TODO: attach operation to object
    }
  }

  private async _processEndpoint(
    controllerInfo: IMappedController,
    endpointInfo: IMappedEndpointDetailed,
  ): Promise<OperationObject> {
    // - create an operation skeleton, with default name if none exists
    // - carry up controller-level fields to the endpoint
    // - for all operation field mutators, run them if the field exists (passing the operation object to mutate)
    // - walk over all parameters
    // - match up their friendlynames with either a built-in parameter handler or a user-defined one
    // - use the schematizerInstance to turn design types into referenced/inferred types on what comes out of the handler
    // - execute that handler to mutate the operation

    // if (controllerInfo.controller.name === 'AController' || controllerInfo.controller.name === 'BController') {
    //   console.log(controllerInfo, endpointInfo)
    // }

    const ret: OperationObject = {
      responses: {},
    };

    return ret;
  }
}
