import { DefaultRequestBody, ResponseResolver } from './handlers/RequestHandler'
import {
  RESTMethods,
  RestContext,
  RestHandler,
  RestRequest,
  RequestParams,
} from './handlers/RestHandler'
import { Path } from './utils/matching/matchRequestUrl'

function createRestHandler(method: RESTMethods | RegExp) {
  return <
    RequestBodyType extends DefaultRequestBody = DefaultRequestBody,
    ResponseBody extends DefaultRequestBody = any,
    Params extends RequestParams = RequestParams,
  >(
    path: Path,
    resolver: ResponseResolver<
      RestRequest<RequestBodyType, Params>,
      RestContext,
      ResponseBody
    >,
  ) => {
    return new RestHandler(method, path, resolver)
  }
}

export const rest = {
  all: createRestHandler(/.+/),
  head: createRestHandler(RESTMethods.HEAD),
  get: createRestHandler(RESTMethods.GET),
  post: createRestHandler(RESTMethods.POST),
  put: createRestHandler(RESTMethods.PUT),
  delete: createRestHandler(RESTMethods.DELETE),
  patch: createRestHandler(RESTMethods.PATCH),
  options: createRestHandler(RESTMethods.OPTIONS),
}
