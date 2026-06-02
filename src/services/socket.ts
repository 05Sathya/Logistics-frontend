import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

class SocketService {
  public socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
