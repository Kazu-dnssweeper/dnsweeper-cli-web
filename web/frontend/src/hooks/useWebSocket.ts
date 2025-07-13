import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    url = 'http://localhost:3001',
    autoConnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const connect = () => {
    if (socketRef.current?.connected) return;

    try {
      const socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        autoConnect: false
      });

      socket.on('connect', () => {
        setIsConnected(true);
        setError(null);
        onConnect?.();
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        onDisconnect?.();
      });

      socket.on('error', (err: Error) => {
        setError(err);
        onError?.(err);
      });

      socket.on('message', (message: WebSocketMessage) => {
        setLastMessage(message);
        onMessage?.(message);
      });

      // 各種イベントリスナー
      socket.on('upload_progress', (data) => {
        const message: WebSocketMessage = { type: 'upload_progress', payload: data };
        setLastMessage(message);
        onMessage?.(message);
      });

      socket.on('analysis_complete', (data) => {
        const message: WebSocketMessage = { type: 'analysis_complete', payload: data };
        setLastMessage(message);
        onMessage?.(message);
      });

      socket.on('dns_update', (data) => {
        const message: WebSocketMessage = { type: 'dns_update', payload: data };
        setLastMessage(message);
        onMessage?.(message);
      });

      socket.on('dns_change_recorded', (data) => {
        const message: WebSocketMessage = { type: 'dns_change_recorded', payload: data };
        setLastMessage(message);
        onMessage?.(message);
      });

      socketRef.current = socket;
      socket.connect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('WebSocket connection failed');
      setError(error);
      onError?.(error);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', message);
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  // 特定のイベントを送信するヘルパー関数
  const startUpload = (fileId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('start_upload', { fileId });
    }
  };

  const requestAnalysis = (recordIds: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request_analysis', { recordIds });
    }
  };

  const subscribeToUpdates = (domains: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe_dns_updates', { domains });
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, autoConnect]);

  return {
    isConnected,
    error,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    startUpload,
    requestAnalysis,
    subscribeToUpdates
  };
};