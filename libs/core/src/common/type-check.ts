export type ExactType<T, Struct> = T extends Struct
    ? Exclude<keyof T, keyof Struct> extends never
        ? T
        : never
    : never;
