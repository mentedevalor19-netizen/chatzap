import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp/media')
export class WhatsappMediaController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get(':mediaId')
  async download(@Param('mediaId') mediaId: string, @Res() response: Response) {
    const media = await this.whatsapp.downloadMedia(mediaId);

    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader('Content-Disposition', 'inline');

    if (media.contentLength) {
      response.setHeader('Content-Length', media.contentLength);
    }

    return response.send(media.buffer);
  }
}
