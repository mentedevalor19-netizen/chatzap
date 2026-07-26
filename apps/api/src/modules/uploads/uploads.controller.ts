import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const uploadRoot = join(process.cwd(), 'uploads');

if (!existsSync(uploadRoot)) {
  mkdirSync(uploadRoot, { recursive: true });
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadRoot,
        filename: (_request, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    const baseUrl = this.config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:4000';
    const url = `${baseUrl}/api/v1/uploads/files/${file.filename}`;

    return {
      id: file.filename,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      mediaUrl: url,
      downloadUrl: url,
    };
  }

  @Get('files/:fileName')
  download(@Param('fileName') fileName: string, @Res() response: Response) {
    return response.sendFile(join(uploadRoot, basename(fileName)));
  }
}
