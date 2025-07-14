/**
 * WebSocket サーバー
 * リアルタイム通信用のSocket.IOサーバー
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger.js';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export class SocketServer {
  private static instance: SocketServer;
  private io: SocketIOServer;
  private connections: Map<string, any> = new Map();

  private constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupSocketHandlers();
  }

  public static getInstance(server?: HTTPServer): SocketServer {
    if (!SocketServer.instance) {
      if (!server) {
        throw new Error('Server instance required for first initialization');
      }
      SocketServer.instance = new SocketServer(server);
    }
    return SocketServer.instance;
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      this.connections.set(socket.id, socket);

      // 接続確認
      socket.emit('connected', {
        id: socket.id,
        timestamp: new Date().toISOString()
      });

      // 切断処理
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connections.delete(socket.id);
      });

      // エラーハンドリング
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });

      // カスタムイベントハンドラー
      socket.on('join_room', (room: string) => {
        socket.join(room);
        logger.info(`Client ${socket.id} joined room: ${room}`);
      });

      socket.on('leave_room', (room: string) => {
        socket.leave(room);
        logger.info(`Client ${socket.id} left room: ${room}`);
      });

      // ハートビート
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
    });
  }

  /**
   * 全クライアントにメッセージを送信
   */
  public broadcast(message: WebSocketMessage): void {
    this.io.emit('message', message);
    logger.debug('Broadcasting message:', message);
  }

  /**
   * 特定のクライアントにメッセージを送信
   */
  public sendToClient(socketId: string, message: WebSocketMessage): void {
    const socket = this.connections.get(socketId);
    if (socket) {
      socket.emit('message', message);
      logger.debug(`Sent message to client ${socketId}:`, message);
    } else {
      logger.warn(`Client ${socketId} not found`);
    }
  }

  /**
   * 特定のルームにメッセージを送信
   */
  public sendToRoom(room: string, message: WebSocketMessage): void {
    this.io.to(room).emit('message', message);
    logger.debug(`Sent message to room ${room}:`, message);
  }

  /**
   * 接続中のクライアント数を取得
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 接続中のクライアントIDリストを取得
   */
  public getConnectedClients(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 特定のクライアントが接続中かチェック
   */
  public isClientConnected(socketId: string): boolean {
    return this.connections.has(socketId);
  }

  /**
   * アップロード進捗の通知
   */
  public notifyUploadProgress(fileId: string, progress: number, message: string): void {
    this.broadcast({
      type: 'upload_progress',
      payload: {
        fileId,
        progress,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 分析進捗の通知
   */
  public notifyAnalysisProgress(analysisId: string, progress: number, message: string): void {
    this.broadcast({
      type: 'analysis_progress',
      payload: {
        analysisId,
        progress,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 分析完了の通知
   */
  public notifyAnalysisComplete(analysisResult: any): void {
    this.broadcast({
      type: 'analysis_complete',
      payload: analysisResult
    });
  }

  /**
   * DNS クエリ完了の通知
   */
  public notifyDnsQueryComplete(queryResult: any): void {
    this.broadcast({
      type: 'dns_query_completed',
      payload: queryResult
    });
  }

  /**
   * エラーの通知
   */
  public notifyError(error: string, details?: any): void {
    this.broadcast({
      type: 'error',
      payload: {
        error,
        details,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * システム情報の通知
   */
  public notifySystemInfo(info: any): void {
    this.broadcast({
      type: 'system_info',
      payload: {
        ...info,
        timestamp: new Date().toISOString()
      }
    });
  }
}