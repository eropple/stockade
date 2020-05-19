import { StringTo } from '@stockade/utils/types';

import { HttpStatus } from '../http-statuses';

export type SecurityOutcome = true | 401 | 403;

export interface ISecurity<TArgs extends StringTo<any> = {}> {

}
