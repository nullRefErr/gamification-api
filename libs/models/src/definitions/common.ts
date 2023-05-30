import { Type } from '@sinclair/typebox';

export const TNullable = (type) => Type.Union([Type.Null(), type]);
export const MongoModel = Type.Object({
  _id: Type.String(),
  createdAt: Type.Date(),
  updatedAt: Type.Date(),
});
