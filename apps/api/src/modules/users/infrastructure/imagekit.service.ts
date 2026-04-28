import { Injectable } from '@nestjs/common';
import ImageKit from 'imagekit';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ImageKitService {
  private readonly client: ImageKit;

  constructor(
    @InjectPinoLogger(ImageKitService.name) private readonly logger: PinoLogger,
  ) {
    this.client = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
    });
  }

  async uploadAvatar(fileBuffer: Buffer, fileName: string): Promise<string> {
    this.logger.debug(`Uploading avatar: ${fileName}`);
    const result = await this.client.upload({
      file: fileBuffer,
      fileName,
      folder: '/avatars',
    });
    return result.url;
  }
}
