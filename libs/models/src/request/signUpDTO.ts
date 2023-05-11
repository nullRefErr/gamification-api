import {Credentials, User} from "../definitions";

export type SignUpDTO =
  Pick<Credentials, 'password' | 'username'>
  & Pick<User, 'name' | 'surname' | 'email' | 'isEULAAccepted'> & { rePassword: string }
