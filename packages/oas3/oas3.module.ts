import { Module } from '@stockade/core';
import { Http, HTTP } from '@stockade/http';
import { bind } from '@stockade/inject';

import { oas3DocumentProvider } from './oas3-document.provider';
import { OAS3Controller } from './oas3.controller';


export const OAS3Module =
  Module('oas3')
    .provide(
      oas3DocumentProvider,
    )
    .apply(
      Http()
        .controllers(OAS3Controller)
    );
