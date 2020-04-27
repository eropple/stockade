import { InfoObject, OpenAPIObject, OperationObject } from 'openapi3-ts';

import { IMappedController, IMappedEndpointDetailed } from '@stockade/http';
import { SchematizedDocumentInstance, Schematizer } from '@stockade/schemas';

import { OAS3Controller } from '../oas3.controller';

export async function buildOAS3(
  info: InfoObject,
  controllers: ReadonlyArray<IMappedController>,
  schematizer: Schematizer,
): Promise<OpenAPIObject> {
  const doc: OpenAPIObject = {
    openapi: '3.1',
    info,
    paths: {},
  };

  const oas3SchemaDocument = schematizer.makeDocumentInstance('#/components/schemas');
  oas3SchemaDocument.insertSchemasIntoObject(doc);

  for (const controllerInfo of controllers) {
    if (controllerInfo.controller === OAS3Controller) { continue; }

    // TODO:  can we parallelize this?
    //        Yes, Node is single-threaded, etc., but some user configurable
    //        stuff can be done asynchronously and so I'd be worried about
    //        stomping on our shared `doc` object.
    await processController(controllerInfo, doc, oas3SchemaDocument);
  }

  return doc;
}

async function processController(
  controllerInfo: IMappedController,
  doc: OpenAPIObject,
  schematizerInstance: SchematizedDocumentInstance,
): Promise<void> {
  for (const endpointInfo of Object.values(controllerInfo.endpoints)) {
    const operation = await processEndpoint(controllerInfo, endpointInfo, schematizerInstance);
    // TODO: attach operation to object
  }
}

async function processEndpoint(
  controllerInfo: IMappedController,
  endpointInfo: IMappedEndpointDetailed,
  schematizerInstance: SchematizedDocumentInstance,
): Promise<OperationObject> {
  // - create an operation skeleton, with default name if none exists
  // - carry up controller-level fields to the endpoint
  // - for all operation field mutators, run them if the field exists (passing the operation object to mutate)
  // - walk over all parameters
  // - match up their friendlynames with either a built-in parameter handler or a user-defined one
  // - use the schematizerInstance to turn design types into referenced/inferred types on what comes out of the handler
  // - execute that handler to mutate the operation

  return {} as any;
}
