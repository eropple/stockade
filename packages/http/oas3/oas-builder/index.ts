import * as _ from 'lodash';
import { flatten } from 'lodash';
import {
  InfoObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
} from 'openapi3-ts';

import { IMappedController, IMappedEndpointDetailed } from '@stockade/http';
import { SchematizedDocumentInstance, Schematizer } from '@stockade/schemas';
import { Logger } from '@stockade/utils/logging';
import { getPropertyCaseInsensitively } from '@stockade/utils/objects';

import { getAllParametersForEndpoint } from '../../facet/utils';
import { OpenAPIConfig } from '../config';
import { OAS3Error } from '../error';
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
      openapi: '3.1.0',
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

    const routeOptions = endpointInfo['@stockade/http:ROUTE_OPTIONS'];
    const tags = [
      ...(controllerInfo['@stockade/http:CONTROLLER_INFO'].tags ?? []),
      ...(routeOptions.tags ?? []),
    ];

    if (tags.length === 0) {
      tags.push('default');
    }

    const repsonseReturnType = flatten([getPropertyCaseInsensitively(
      'content-type',
      endpointInfo['@stockade/http:ROUTE_OPTIONS'].returnHeaders || {},
    )])[0] ?? 'application/json';

    const responses: ResponsesObject =
      routeOptions.responses ??
      Object.fromEntries(
        Object.entries(endpointInfo.responses)
          .map(entry => [
            entry[0],
            {
              description: '',
              content: {
                [repsonseReturnType]: {
                  schema: this.schematizerInstance.inferOrReference(entry[1]),
                },
              }
            } as ResponseObject,
          ],
        ),
      );

    let requestBody: RequestBodyObject | undefined;
    const overridingRequestBody = endpointInfo['@stockade/http:ROUTE_OPTIONS'].requestBody;
    if (overridingRequestBody) {
      logger.debug('Explicitly declared request body; assigning.');
      requestBody = overridingRequestBody
    } else if (endpointInfo.requestBody) {
      logger.debug('Parameterized request body; parsing with schematizer.');
      const contentType = endpointInfo.requestBody.contentType ?? 'application/json';

      requestBody = {
        content: {
          [contentType]: {
            schema:
              // TODO:  improve openapi3-ts to understand @types/json-schema?
              //        https://github.com/metadevpro/openapi3-ts/issues/61
              this.schematizerInstance.inferOrReference(
                endpointInfo.requestBody?.schema,
              ) as SchemaObject | ReferenceObject,
          },
        },
      };
    } else {
      logger.trace('No request body.');
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

      parameters: [],

      requestBody,

      responses,
    };

    logger.trace({ operationState: ret }, 'operation state after initial copy from route options');

    const allParameters = getAllParametersForEndpoint(endpointInfo);
    for (const parameter of allParameters) {
      if (!parameter) { continue; }
      const oasParam: ParameterObject = {
        ...parameter,
        // TODO:  improve openapi3-ts to understand @types/json-schema?
        schema: this.schematizerInstance.inferOrReference(parameter.schema) as SchemaObject,
      }

      // TODO: eventually this should support `explode` and `allowEmptyValue`
      // this is intentionally left blank aside from the default;
      // modify it later as needed for the logic required.
      switch (parameter.in) {
        case 'header':
          break;
        case 'path':
          break;
        case 'query':
          break;
        default:
          throw new OAS3Error(
            `endpoint '${endpointInfo.handlerName}' in '${endpointInfo.controller.name}': ` +
            `Unrecognized parameter.in '${(parameter as any).in ?? 'undefined'}'.`,
          );
      }

      ret.parameters!.push(oasParam);
    }
    logger.trace({ operationState: ret }, 'operation state after parameter extraction');

    const fn = this.config.modifyEndpointFn;
    if (fn) {
      logger.debug('Invoking modifyEndpointFn.');
      await fn(ret, controllerInfo, endpointInfo);
      logger.trace({ operationState: ret }, 'operation state after modifyEndpointFn');
    }

    return ret;
  }
}
