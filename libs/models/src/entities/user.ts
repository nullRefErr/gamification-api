import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {Document} from 'mongoose';
import {User} from '../definitions';
import {ExactType} from "@gamification-api/core";

export type UserEntityDocument = UserEntity & Document;

@Schema({timestamps: true, versionKey: false})
export class UserEntity implements ExactType<UserEntity, User> {
  @Prop()
  email: User['email'];
  @Prop()
  name: User['name'];
  @Prop()
  surname: User['surname'];
  @Prop()
  isActivated: User['isActivated'];
  @Prop()
  isEULAAccepted: User['isEULAAccepted'];
  @Prop()
  isBanned: User['isBanned'];
  @Prop()
  refCode: User['refCode'];

  _id: User['_id'];
  createdAt: User['createdAt'];
  updatedAt: User['updatedAt'];
}


export const UserEntitySchema = SchemaFactory.createForClass(UserEntity);
