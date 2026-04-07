import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^\S+$/, { message: 'name must be a single word with no spaces' })
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
