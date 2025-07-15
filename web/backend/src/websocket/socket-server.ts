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
  public notifyAnalysisProgress(analysisId: string, progress: number, stage: string): void {
    this.broadcast({
      type: 'analysis_progress',
      payload: {
        analysisId,
        progress,
        stage,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * リアルタイム分析データの配信
   */
  public broadcastAnalyticsUpdate(analyticsData: any): void {
    this.broadcast({
      type: 'analytics_update',
      payload: analyticsData
    });
  }

  /**
   * 新しいアラートの通知
   */
  public notifyNewAlert(alert: any): void {
    this.broadcast({
      type: 'new_alert',
      payload: alert
    });
  }

  /**
   * DNS クエリ完了の通知
   */
  public notifyDNSQueryCompleted(queryData: any): void {
    this.broadcast({
      type: 'dns_query_completed',
      payload: queryData
    });
  }

  /**
   * システム健全性の更新
   */
  public notifySystemHealth(healthData: any): void {
    this.broadcast({
      type: 'system_health_update',
      payload: healthData
    });
  }

  /**
   * パフォーマンスメトリクスの更新
   */
  public notifyPerformanceMetrics(metrics: any): void {
    this.broadcast({
      type: 'performance_metrics',
      payload: metrics
    });
  }

  /**
   * セキュリティイベントの通知
   */
  public notifySecurityEvent(event: any): void {
    this.broadcast({
      type: 'security_event',
      payload: event
    });
  }

  /**
   * AI異常検知の通知
   */
  public notifyAnomalyDetected(anomaly: any): void {
    this.broadcast({
      type: 'anomaly_detected',
      payload: anomaly
    });
  }

  /**
   * エッジロケーション状態の更新
   */
  public notifyEdgeLocationUpdate(locationData: any): void {
    this.broadcast({
      type: 'edge_location_update',
      payload: locationData
    });
  }

  /**
   * テナント活動の通知
   */
  public notifyTenantActivity(tenantId: string, activity: any): void {
    this.sendToRoom(`tenant_${tenantId}`, {
      type: 'tenant_activity',
      payload: activity
    });
  }

  /**
   * リアルタイム分析の定期配信を開始
   */
  public startRealtimeAnalytics(): void {
    // 5秒ごとにダミーデータを配信
    setInterval(() => {
      const analyticsData = this.generateRealtimeAnalyticsData();
      this.broadcastAnalyticsUpdate(analyticsData);

      // ランダムでアラートを生成
      if (Math.random() < 0.1) { // 10%の確率
        const alert = this.generateRandomAlert();
        this.notifyNewAlert(alert);
      }

      // パフォーマンスメトリクスの更新
      const metrics = this.generatePerformanceMetrics();
      this.notifyPerformanceMetrics(metrics);

    }, 5000);

    logger.info('リアルタイム分析の配信を開始しました');
  }

  /**
   * リアルタイム分析データの生成
   */
  private generateRealtimeAnalyticsData(): any {
    return {
      timestamp: new Date().toISOString(),
      overview: {
        queriesPerSecond: Math.floor(Math.random() * 150) + 50,
        averageResponseTime: Math.floor(Math.random() * 50) + 25,
        errorRate: Math.random() * 5,
        activeConnections: Math.floor(Math.random() * 500) + 100
      },
      security: {
        suspiciousQueries: Math.floor(Math.random() * 10),
        riskScore: Math.floor(Math.random() * 30) + 10
      },
      performance: {
        cpuUsage: Math.floor(Math.random() * 60) + 20,
        memoryUsage: Math.floor(Math.random() * 70) + 15,
        diskUsage: Math.floor(Math.random() * 50) + 25
      }
    };
  }

  /**
   * ランダムアラートの生成
   */
  private generateRandomAlert(): any {
    const types = ['warning', 'error', 'info', 'security'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: this.getAlertTitle(type),
      description: this.getAlertDescription(type),
      impact: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      timestamp: new Date(),
      affectedSystems: ['DNS-01', 'Cache-Server'],
      acknowledged: false
    };
  }

  /**
   * パフォーマンスメトリクスの生成
   */
  private generatePerformanceMetrics(): any {
    return {
      timestamp: new Date().toISOString(),
      cpu: Math.floor(Math.random() * 80) + 10,
      memory: Math.floor(Math.random() * 90) + 5,
      disk: Math.floor(Math.random() * 70) + 15,
      network: Math.floor(Math.random() * 100) + 50,
      queriesPerSecond: Math.floor(Math.random() * 200) + 100,
      cacheHitRate: Math.floor(Math.random() * 30) + 70,
      responseTime: Math.floor(Math.random() * 100) + 20
    };
  }

  /**
   * アラートタイトルの生成
   */
  private getAlertTitle(type: string): string {
    const titles = {
      warning: ['応答時間警告', 'キャッシュミス率上昇', 'CPU使用率上昇'],
      error: ['DNS解決エラー', 'サーバー接続失敗', 'データベース接続エラー'],
      info: ['定期メンテナンス', 'システム更新完了', '新機能リリース'],
      security: ['疑わしいクエリ検出', 'DDoS攻撃の可能性', 'マルウェアドメインアクセス']
    };
    
    const typeList = titles[type as keyof typeof titles] || titles.info;
    return typeList[Math.floor(Math.random() * typeList.length)];
  }

  /**
   * アラート説明の生成
   */
  private getAlertDescription(type: string): string {
    const descriptions = {
      warning: 'パフォーマンスの低下が検出されました。継続的な監視が必要です。',
      error: '重大な問題が発生しています。即座の対応が必要です。',
      info: 'システムの状態に関する情報です。確認してください。',
      security: 'セキュリティに関する潜在的な脅威が検出されました。'
    };
    
    return descriptions[type as keyof typeof descriptions] || descriptions.info;
  }
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