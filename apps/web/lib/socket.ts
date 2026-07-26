'use client';

import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getChatSocket(token: string) {
  if (socket && currentToken === token) {
    return socket;
  }

  socket?.disconnect();
  currentToken = token;
  socket = io(WS_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  return socket;
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}

export function emitTyping(event: 'typing.start' | 'typing.stop', conversationId: string) {
  socket?.emit(event, { conversationId });
}
