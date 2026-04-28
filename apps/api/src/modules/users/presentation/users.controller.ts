import { Controller, Patch, Post, Body, UploadedFile, UseInterceptors, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { UploadAvatarUseCase } from '../application/use-cases/upload-avatar.use-case';
import { UpdateProfileUseCase } from '../application/use-cases/update-profile.use-case';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}

@Controller('users')
export class UsersController {

  constructor(
    @InjectPinoLogger(UsersController.name) private readonly logger: PinoLogger,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() payload: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.info(`POST /users/me/avatar - user: ${payload.id}`);
    if (!file) throw new BadRequestException('No file provided');

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, or WebP images are allowed');
    }

    const user = await this.uploadAvatarUseCase.execute(payload.id, file.buffer, file.originalname);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      imageUrl: user.imageUrl,
    };
  }

  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() payload: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    this.logger.info(`PATCH /users/me/profile - user: ${payload.id}`);
    const user = await this.updateProfileUseCase.execute(payload.id, dto.name);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      imageUrl: user.imageUrl,
    };
  }
}
