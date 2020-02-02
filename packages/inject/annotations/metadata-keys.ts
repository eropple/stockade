function p(name: string) {
  return `@stockade/inject:${name}`;
}

export const MetadataKeys = {
  AUTO_COMPONENT: p('AUTO_COMPONENT'),
  INJECT: p('INJECT'),
};
