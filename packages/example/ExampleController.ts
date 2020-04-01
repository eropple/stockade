import { Controller, Get, Path, Query } from '@stockade/http';

@Controller({
  basePath: '/foo',
})
export class ExampleController {
  @Get('/hello/:bar', {
    returnHeaders: {
      'content-type': 'application/json',
    },
  })
  testMethod() {
    return {};
    // return { bar, foo };
  }
}
