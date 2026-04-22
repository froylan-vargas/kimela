import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const REGISTER_NAME_MAX_LENGTH = 30;
export const REGISTER_NAME_ALLOWED_PATTERN = /^[\p{L}\p{N}._ -]+$/u;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(REGISTER_NAME_MAX_LENGTH)
  @Matches(REGISTER_NAME_ALLOWED_PATTERN, {
    message: 'name may only contain letters, numbers, spaces, periods, underscores, and hyphens',
  })
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'password must contain uppercase, lowercase, a number, and a special character',
  })
  password!: string;
}
