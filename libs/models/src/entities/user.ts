import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {Document} from 'mongoose';
import {User} from '../definitions';
import {ExactType} from "@gamification-api/core";

export type UserEntityDocument = UserEntity & Document;

@Schema({timestamps: true, versionKey: false})
export class UserEntity implements ExactType<UserEntity, User> {
  @Prop()
  email: string;
  @Prop()
  name: string;
  @Prop()
  surname: string;
  @Prop()
  isActivated: boolean;
  @Prop()
  isEULAAccepted: boolean;
  @Prop()
  isBanned: boolean;
  @Prop()
  refCode: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}


export const UserEntitySchema = SchemaFactory.createForClass(UserEntity);
