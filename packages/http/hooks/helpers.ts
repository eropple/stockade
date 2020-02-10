import { Class } from 'utility-types';

export function hasOnRequestHook(cls: Class<any>) {
  return !!(cls.prototype).onRequest;
}

export function hasPreParsingHook(cls: Class<any>) {
  return !!(cls.prototype).preParsing;
}

export function hasPreValidationHook(cls: Class<any>) {
  return !!(cls.prototype).preValidation;
}

export function hasPreSerializationHook(cls: Class<any>) {
  return !!(cls.prototype).preSerialization;
}

export function hasOnErrorHook(cls: Class<any>) {
  return !!(cls.prototype).onError;
}

export function hasOnSendHook(cls: Class<any>) {
  return !!(cls.prototype).onSend;
}

export function hasOnResponseHook(cls: Class<any>) {
  return !!(cls.prototype).onResponse;
}
