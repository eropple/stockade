import { Class } from 'utility-types';

import {
  getConstructorParameterMetadataForClass, PARAMETER_DESIGN_TYPE,
} from '@stockade/utils/metadata';

import { MetadataKeys } from '../annotations/metadata-keys';
import { UnrecognizedProviderError } from '../lifecycle/errors';
import { forKey } from './dependency-utils';
import { AutomaticTypeDiscoveryError, NoTypeMetadataError } from './errors';
import {
  DomainProvider,
  isDomainFactoryProvider,
  isDomainValueProvider,
} from './types';

/**
 * This is a list of types for the "hey, this is probably not what you
 * "meant to do" help suggestion. It should probably expand to, at minimum,
 * contain the object list in this:
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
 *
 * TODO: expand this list
 */
const INVALID_INJECT_TYPES: ReadonlySet<Function> = new Set([
  Number, String, Boolean, Function, BigInt, Symbol, Date,
]);

export function prettyPrintProviders(providers: ReadonlyArray<DomainProvider>) {
  return providers.map(p => {
    const type =
      isDomainValueProvider(p)
        ? 'value'
        : isDomainFactoryProvider(p)
          ? 'factory/class'
          : null;

    if (!type) {
      throw new UnrecognizedProviderError(`Could not introspect provider '${p}'.`);
    }

    return `[${p.key.description} in ${p.lifecycle.name.description} (${type})]`;
  });
}

export function extractInjectedParameters(cls: Class<any>): Array<symbol> {
  const allParamMetadata = getConstructorParameterMetadataForClass(cls);

  const injectKeys: Array<symbol> = [];
  for (const [idx, param] of allParamMetadata.entries()) {
    const specifiedInjectKey = param[MetadataKeys.INJECT];
    if (specifiedInjectKey) {
      injectKeys[idx] = specifiedInjectKey;
    } else {
      injectKeys[idx] = forKey(validateDesignTypeForInject(cls, idx, param[PARAMETER_DESIGN_TYPE]));
    }
  }

  return injectKeys;
}

function validateDesignTypeForInject(cls: Class<any>, idx: number, t: any): symbol {
  if (!t) {
    throw new NoTypeMetadataError(
      `Class '${cls.name}' has no type metadata on its constructor parameters. This ` +
      `usually means an initialization order error. Please file a bug with a working ` +
      `case so it can be autopsied.`,
    );
  }

  if (t === Promise || t.name === 'Promise') {
    throw new AutomaticTypeDiscoveryError(
      `Class '${cls.name}', constructor index '${idx}: Automatic type discovery found a Promise ` +
      `(or thinks it did, anyway). Promises are not directly supported by the dependency injector ` +
      `because construction is always asynchronous. Instead of Promise<T>, just use T.`,
    );
  }

  if (t === Object) {
    throw new AutomaticTypeDiscoveryError(
      `Class '${cls.name}', constructor index '${idx}: Automatic type discovery found an Object ` +
      `(or thinks it did, anyway). This usually means you used a complex type expression, such as ` +
      `an interface, a type, or a compound expression like (ClassA | ClassB), and TypeScript ` +
      `can't express that in its runtime type information. You'll need to either use a single ` +
      `class as a term (such as the abstract parent of two classes) or explicitly define a ` +
      `dependency key using the @Inject() parameter decorator.`,
    );
  }

  if (INVALID_INJECT_TYPES.has(t)) {
    throw new AutomaticTypeDiscoveryError(
      `Class '${cls.name}', constructor index '${idx}: Automatic type discovery has found that ` +
      `this parameter is a built-in type, '${t.name}'. For safety and sanity purposes, it is illegal ` +
      `in the Stockade injector to specify a built-in type as an injector key. You'll need to ` +
      `explicitly specify the injector key for this parameter using the @Inject() parameter decorator.`,
    );
  }

  return forKey(t);
}
