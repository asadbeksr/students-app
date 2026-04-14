// Modified from polito/students-app — 2026-04-13

export const notNullish = <T>(i: T): i is NonNullable<T> => i != null;
export const notUndefined = (i: unknown) => i !== undefined;
export const negate = (val: unknown) => !val;
