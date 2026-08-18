import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const expiresIn = (this.config.get<string>('JWT_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'];
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      },
      {
        expiresIn,
      },
    );

    return {
      accessToken,
      user: authUser,
    };
  }
}
