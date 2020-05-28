import 'reflect-metadata';
import { Class } from 'utility-types';

import { classMergeObjectMetadata } from '@stockade/utils/metadata';

import { SUB_FACET } from '../lifecycle';
import { MetadataKeys } from './metadata-keys';

export interface IAutoComponentArgs {
  key?: string;
  lifecycle: symbol;
}

export const DEFAULT_AUTO_COMPONENT_ARGS: IAutoComponentArgs = {
  lifecycle: SUB_FACET,
};

export const {
  decorator: AutoComponent,
  getter: getAutoComponentMetadata,
} = classMergeObjectMetadata<IAutoComponentArgs>(MetadataKeys.AUTO_COMPONENT, DEFAULT_AUTO_COMPONENT_ARGS);

export function getAutoComponentMetadataOrFail(o: Class<any>) {
  const autoComponentMetadata = getAutoComponentMetadata(o);

  if (!autoComponentMetadata) {
    throw new Error(
      `No autocomponent metadata found for '${o}'. Please make sure ` +
      `it has the @AutoComponent() decorator.`,
    );
  }

  return autoComponentMetadata;
}
