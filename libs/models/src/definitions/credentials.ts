import { Static, Type } from '@sinclair/typebox';
import { MongoModel } from './common';

const TCredentials = Type.Object({
  ...MongoModel.properties,
  userId: Type.String(),
  username: Type.String(),
  password: Type.String(),
  passwordChangedAt: Type.Date(),
  lastPassword: Type.String(),
});

export type Credentials = Static<typeof TCredentials>;
