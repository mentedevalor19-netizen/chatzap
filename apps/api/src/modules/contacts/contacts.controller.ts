import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.contactsService.findAll(user, search);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.remove(user, id);
  }

  @Get(':id/notes')
  listNotes(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.listNotes(user, id);
  }

  @Post(':id/notes')
  addNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.contactsService.addNote(user, id, dto);
  }
}
