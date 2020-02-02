export type PropertyOf<TClass> = Exclude<keyof TClass, number>;

// tslint:disable-next-line: interface-over-type-literal
export type StringTo<T> = { [key: string]: T };
