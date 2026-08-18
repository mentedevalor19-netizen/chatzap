import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { promisify } from 'node:util';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const uploadRoot = join(process.cwd(), 'uploads');
const execFileAsync = promisify(execFile);

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
  async upload(@UploadedFile() file: Express.Multer.File, @Query('voice') voice?: string) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const storedFile = this.isTruthy(voice) ? await this.convertToVoiceNote(file) : file;
    const baseUrl = this.config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:4000';
    const url = `${baseUrl}/api/v1/uploads/files/${storedFile.filename}`;

    return {
      id: storedFile.filename,
      fileName: storedFile.originalname,
      mimeType: storedFile.mimetype,
      size: storedFile.size,
      mediaUrl: url,
      downloadUrl: url,
    };
  }

  @Get('files/:fileName')
  download(@Param('fileName') fileName: string, @Res() response: Response) {
    return response.sendFile(join(uploadRoot, basename(fileName)));
  }

  private async convertToVoiceNote(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('Voice note conversion requires an audio file');
    }

    const sourcePath = join(uploadRoot, file.filename);
    const targetFileName = `${randomUUID()}.ogg`;
    const targetPath = join(uploadRoot, targetFileName);

    try {
      await execFileAsync(
        'ffmpeg',
        [
          '-y',
          '-i',
          sourcePath,
          '-vn',
          '-ac',
          '1',
          '-c:a',
          'libopus',
          '-b:a',
          '32k',
          '-application',
          'voip',
          targetPath,
        ],
        { timeout: 120_000 },
      );

      unlinkSync(sourcePath);

      return {
        ...file,
        filename: targetFileName,
        originalname: `${basename(file.originalname, extname(file.originalname)) || 'audio'}.ogg`,
        mimetype: 'audio/ogg; codecs=opus',
        size: statSync(targetPath).size,
        path: targetPath,
      };
    } catch (error) {
      if (existsSync(targetPath)) {
        unlinkSync(targetPath);
      }
      if (existsSync(sourcePath)) {
        unlinkSync(sourcePath);
      }

      throw new InternalServerErrorException(
        error instanceof Error ? `Audio conversion failed: ${error.message}` : 'Audio conversion failed',
      );
    }
  }

  private isTruthy(value?: string) {
    return value === 'true' || value === '1' || value === 'yes';
  }
}
