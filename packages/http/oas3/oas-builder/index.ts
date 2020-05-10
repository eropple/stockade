import * as _ from 'lodash';
import { InfoObject, OpenAPIObject, OperationObject, PathItemObject } from 'openapi3-ts';

import { IMappedController, IMappedEndpointDetailed } from '@stockade/http';
import { SchematizedDocumentInstance, Schematizer } from '@stockade/schemas';
import { Logger } from '@stockade/utils/logging';

import { OpenAPIConfig } from '../config';
import { OAS3Controller } from '../oas3.controller';

// classes, poor man's closures, etc.
export class OASBuilder {
  private readonly logger: Logger;
  private readonly schematizerInstance: SchematizedDocumentInstance;

  constructor(
    logger: Logger,
    schematizer: Schematizer,
    private readonly config: OpenAPIConfig,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
    this.logger.level = 'debug';
    this.schematizerInstance = schematizer.makeDocumentInstance('#/components/schemas');
  }

  async build(
    controllers: ReadonlyArray<IMappedController>,
    info: InfoObject,
  ): Promise<OpenAPIObject> {
    const logger = this.logger.child({ oas3BuilderPhase: 'build' });
    const doc: OpenAPIObject = {
      openapi: '3.1',
      info,
      paths: {},
      components: {
        schemas: {},
      },
    };

    logger.debug('Inserting schemas into base document.');
    this.schematizerInstance.insertSchemasIntoObject(doc);
    logger.debug({ schemaCount: doc.components?.schemas?.length }, 'Schemas inserted into doc.');

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
    const logger = this.logger.child({
      oas3BuilderPhase: '_processController',
      controllerName: controllerInfo.controller.name,
    });
    logger.debug('processing controller.');
    for (const endpointInfo of Object.values(controllerInfo.endpoints)) {
      const operation = await this._processEndpoint(controllerInfo, endpointInfo);
      // TODO: attach operation to object
      logger.debug({
        endpointName: endpointInfo.handlerName,
        operation,
      }, 'operation returned for endpoint.');

      const pathItem: PathItemObject = doc.paths[endpointInfo.fullUrlPath] ?? {};
      doc.paths[endpointInfo.fullUrlPath] = pathItem;

      pathItem[endpointInfo['@stockade/http:ROUTE_METHOD'].toLowerCase()] = operation;
    }
  }

  private async _processEndpoint(
    controllerInfo: IMappedController,
    endpointInfo: IMappedEndpointDetailed,
  ): Promise<OperationObject> {
    const logger = this.logger.child({
      oas3BuilderPhase: '_processEndpoint',
      controllerName: controllerInfo.controller.name,
      endpointName: endpointInfo.handlerName,
    });
    logger.debug('processing endpoint.');
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

    const routeOptions = endpointInfo['@stockade/http:ROUTE_OPTIONS'];
    const tags = [
      ...(controllerInfo['@stockade/http:CONTROLLER_INFO'].tags ?? []),
      ...(routeOptions.tags ?? []),
    ];

    if (tags.length === 0) {
      tags.push('default');
    }

    const ret: OperationObject = {
      operationId: routeOptions.operationId ?? endpointInfo.handlerName,

      summary: routeOptions.summary,
      description: routeOptions.description,
      deprecated:
        routeOptions.deprecated ??
        controllerInfo['@stockade/http:CONTROLLER_INFO'].deprecated,
      externalDocs: routeOptions.externalDocs,
      callbacks: routeOptions.callbacks,
      tags,


      responses: {},
    };

    const fn = this.config.modifyEndpointFn;
    if (fn) {
      await fn(ret, controllerInfo, endpointInfo);
    }

    return ret;
  }
}
