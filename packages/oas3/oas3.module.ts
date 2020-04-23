import { Module } from '@stockade/core';
import { Http, HTTP } from '@stockade/http';
import { bind } from '@stockade/inject';

import { OAS3Controller } from './oas3.controller';
import { oas3DocumentProvider } from './openapi-document.factory';


export const OAS3Module =
  Module('oas3')
    .provide(
      oas3DocumentProvider,
    )
    .apply(
      Http()
        .controllers(OAS3Controller)
    );
