import { Controller, FastifyRequest, Get, Path, Post, Query, Request, RequestBody } from '@stockade/http';
import { Model, Prop } from '@stockade/schemas';

@Model()
export class RBody {
  @Prop()
  foo!: number;

  @Prop()
  baz!: string;
}

@Controller({
  basePath: '/foo',
})
export class ExampleController {
  @Get('/hello/:bar')
  testGet(
    @Path('bar') bar: number,
    @Query('foo', { required: true }) foo: number,
    @Request() req: FastifyRequest,
  ) {
    console.log(req)

    return { bar, foo };
  }

  @Post('/hello')
  testPost(
    @RequestBody(RBody) body: RBody,
    @Request() req: FastifyRequest,
  ) {
    return body;
  }
}
