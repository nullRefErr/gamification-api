import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {Document} from 'mongoose';
import {Credentials, User} from '../definitions';
import {ExactType} from "@gamification-api/core";

export type CredentialsEntityDocument = CredentialsEntity & Document;

@Schema({timestamps: true, versionKey: false})
export class CredentialsEntity implements ExactType<CredentialsEntity, Credentials> {
  @Prop()
  userId: Credentials['userId'];
  @Prop()
  username: Credentials['username'];
  @Prop()
  password: Credentials['password'];
  @Prop()
  passwordChangedAt: Credentials['passwordChangedAt'];
  @Prop()
  lastPassword: Credentials['lastPassword'];

  _id: User['_id'];
  createdAt: User['createdAt'];
  updatedAt: User['updatedAt'];
}


export const CredentialsEntitySchema = SchemaFactory.createForClass(CredentialsEntity);
