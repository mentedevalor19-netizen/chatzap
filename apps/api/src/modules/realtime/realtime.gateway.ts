import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

type RealtimeEvent =
  | 'conversation.upsert'
  | 'conversation.read'
  | 'message.created'
  | 'message.status'
  | 'contact.upsert'
  | 'typing.start'
  | 'typing.stop';

interface SocketJwtPayload {
  sub: string;
  organizationId: string;
  email: string;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwt.verify<SocketJwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-secret',
      });
      client.data.user = payload;
      client.join(this.organizationRoom(payload.organizationId));
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation.join')
  joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ) {
    if (body.conversationId) {
      client.join(this.conversationRoom(body.conversationId));
    }
  }

  @SubscribeMessage('conversation.leave')
  leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ) {
    if (body.conversationId) {
      client.leave(this.conversationRoom(body.conversationId));
    }
  }

  @SubscribeMessage('typing.start')
  startTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: string }) {
    this.forwardTyping(client, 'typing.start', body.conversationId);
  }

  @SubscribeMessage('typing.stop')
  stopTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: string }) {
    this.forwardTyping(client, 'typing.stop', body.conversationId);
  }

  emitToOrganization<T>(organizationId: string, event: RealtimeEvent, payload: T) {
    this.server?.to(this.organizationRoom(organizationId)).emit(event, payload);
  }

  emitToConversation<T>(
    organizationId: string,
    conversationId: string,
    event: RealtimeEvent,
    payload: T,
  ) {
    this.server
      ?.to(this.organizationRoom(organizationId))
      .to(this.conversationRoom(conversationId))
      .emit(event, payload);
  }

  private forwardTyping(client: Socket, event: RealtimeEvent, conversationId?: string) {
    const user = client.data.user as SocketJwtPayload | undefined;

    if (!user || !conversationId) {
      return;
    }

    client.broadcast.to(this.conversationRoom(conversationId)).emit(event, {
      conversationId,
      userId: user.sub,
      email: user.email,
    });
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return undefined;
  }

  private organizationRoom(organizationId: string) {
    return `organization:${organizationId}`;
  }

  private conversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }
}
