import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {Document} from 'mongoose';
import {Credentials} from '../definitions';
import {ExactType} from "@gamification-api/core";

export type CredentialsEntityDocument = CredentialsEntity & Document;

@Schema({timestamps: true, versionKey: false})
export class CredentialsEntity implements ExactType<CredentialsEntity, Credentials> {
  @Prop()
  userId: string;
  @Prop()
  username: string;
  @Prop()
  password: string;
  @Prop()
  passwordChangedAt: Date;
  @Prop()
  lastPassword: string;

  _id: string;
  createdAt: Date;
  updatedAt: Date;
}


export const CredentialsEntitySchema = SchemaFactory.createForClass(CredentialsEntity);
