import { Class } from 'utility-types';

import {
  IOnErrorHook,
  IOnRequestHook,
  IOnResponseHook,
  IOnSendHook,
  IPreHandlerHook,
  IPreParsingHook,
  IPreSerializationHook,
  IPreValidationHook,
} from './fastify-hook-interfaces';

export function hasOnRequestHook(cls: Class<any>): cls is Class<IOnRequestHook> {
  return !!(cls.prototype).onRequest;
}

export function hasPreParsingHook(cls: Class<any>): cls is Class<IPreParsingHook> {
  return !!(cls.prototype).preParsing;
}

export function hasPreValidationHook(cls: Class<any>): cls is Class<IPreValidationHook> {
  return !!(cls.prototype).preValidation;
}

export function hasPreSerializationHook(cls: Class<any>): cls is Class<IPreSerializationHook> {
  return !!(cls.prototype).preSerialization;
}

export function hasPreHandlerHook(cls: Class<any>): cls is Class<IPreHandlerHook> {
  return !!(cls.prototype).preHandler;
}

export function hasOnErrorHook(cls: Class<any>): cls is Class<IOnErrorHook> {
  return !!(cls.prototype).onError;
}

export function hasOnSendHook(cls: Class<any>): cls is Class<IOnSendHook> {
  return !!(cls.prototype).onSend;
}

export function hasOnResponseHook(cls: Class<any>): cls is Class<IOnResponseHook> {
  return !!(cls.prototype).onResponse;
}
