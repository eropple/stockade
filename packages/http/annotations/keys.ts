export const AnnotationKeys = Object.freeze({
  // controllers
  CONTROLLER_INFO: '@stockade/http:CONTROLLER_INFO' as const,

  // controllers or routes
  ROUTE_PATH: '@stockade/http:ROUTE_PATH' as const,
  HOOKS: '@stockade/http:HOOKS' as const,

  // routes
  ROUTE_METHOD: '@stockade/http:ROUTE_METHOD' as const,
  ENDPOINT_INFO: '@stockade/http:ENDPOINT_INFO' as const,
  ROUTE_OPTIONS: '@stockade/http:ROUTE_OPTIONS' as const,

  // parameters
  PARAMETER_RESOLVER: '@stockade/http:PARAMETER_RESOLVER' as const,
  EXPLICIT_PARAMETERS: '@stockade/http:EXPLICIT_PARAMETERS' as const,

  // security
  SECURITY: '@stockade/http:SECURITY' as const,
} as const);
