import { UserRole } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
