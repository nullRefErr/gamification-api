import { Static, Type } from '@sinclair/typebox';
import { MongoModel } from './common';

const TUser = Type.Object({
  ...MongoModel.properties,
  email: Type.String(),
  name: Type.String(),
  surname: Type.String(),
  isActivated: Type.Boolean({ default: false }),
  isEULAAccepted: Type.Boolean({ default: false }),
  isBanned: Type.Boolean({ default: false }),
  refCode: Type.String(),
});

export type User = Static<typeof TUser>;
