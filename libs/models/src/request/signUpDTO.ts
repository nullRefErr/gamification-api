import {BaseRequestDto} from '@gamification-api/core'
import {Credentials, User} from "../definitions";

type dto =
  Pick<Credentials, 'password' | 'username'>
  & Pick<User, 'name' | 'surname' | 'email' | 'isEULAAccepted'> & { rePassword: string }

export type SignUpDTO = BaseRequestDto<dto>;
