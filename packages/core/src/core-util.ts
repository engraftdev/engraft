import { Tool } from './core.js';

export type ProgramOf<T> = T extends Tool<infer P> ? P : never;
// alt: Parameters<T['run']>[1]['program'];
