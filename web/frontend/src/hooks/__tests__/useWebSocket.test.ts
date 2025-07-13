import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Socket.io のモック
const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  connected: false
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastMessage).toBe(null);
  });

  it('connects automatically when autoConnect is true', () => {
    renderHook(() => useWebSocket({ autoConnect: true }));

    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('does not connect automatically when autoConnect is false', () => {
    renderHook(() => useWebSocket({ autoConnect: false }));

    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('manually connects when connect is called', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.connect();
    });

    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('disconnects when disconnect is called', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('handles connection events', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    renderHook(() => useWebSocket({ 
      autoConnect: true,
      onConnect,
      onDisconnect
    }));

    // connect イベントをシミュレート
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectHandler) {
      act(() => {
        connectHandler();
      });
    }

    expect(onConnect).toHaveBeenCalled();

    // disconnect イベントをシミュレート
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
    if (disconnectHandler) {
      act(() => {
        disconnectHandler();
      });
    }

    expect(onDisconnect).toHaveBeenCalled();
  });

  it('handles error events', () => {
    const onError = vi.fn();
    const testError = new Error('Test error');

    renderHook(() => useWebSocket({ 
      autoConnect: true,
      onError
    }));

    // error イベントをシミュレート
    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error')?.[1];
    if (errorHandler) {
      act(() => {
        errorHandler(testError);
      });
    }

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('handles message events', () => {
    const onMessage = vi.fn();
    const testMessage = { type: 'upload_progress' as const, payload: { data: 'test' } };

    const { result } = renderHook(() => useWebSocket({ 
      autoConnect: true,
      onMessage
    }));

    // message イベントをシミュレート
    const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
    if (messageHandler) {
      act(() => {
        messageHandler(testMessage);
      });
    }

    expect(onMessage).toHaveBeenCalledWith(testMessage);
    expect(result.current.lastMessage).toEqual(testMessage);
  });

  it('sends messages when connected', () => {
    mockSocket.connected = true;
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    const testMessage = { type: 'upload_progress' as const, payload: { data: 'test' } };

    act(() => {
      result.current.sendMessage(testMessage);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message', testMessage);
  });

  it('warns when sending message while disconnected', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockSocket.connected = false;
    
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    const testMessage = { type: 'upload_progress' as const, payload: { data: 'test' } };

    act(() => {
      result.current.sendMessage(testMessage);
    });

    expect(consoleSpy).toHaveBeenCalledWith('WebSocket is not connected');
    expect(mockSocket.emit).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('provides helper functions for specific events', () => {
    mockSocket.connected = true;
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.startUpload('file123');
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('start_upload', { fileId: 'file123' });

    act(() => {
      result.current.requestAnalysis(['rec1', 'rec2']);
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('request_analysis', { recordIds: ['rec1', 'rec2'] });

    act(() => {
      result.current.subscribeToUpdates(['domain1.com', 'domain2.com']);
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_dns_updates', { domains: ['domain1.com', 'domain2.com'] });
  });

  it('handles specific event types', () => {
    const onMessage = vi.fn();
    
    renderHook(() => useWebSocket({ 
      autoConnect: true,
      onMessage
    }));

    // upload_progress イベントをシミュレート
    const uploadProgressHandler = mockSocket.on.mock.calls.find(call => call[0] === 'upload_progress')?.[1];
    if (uploadProgressHandler) {
      const testData = { progress: 50 };
      act(() => {
        uploadProgressHandler(testData);
      });
      expect(onMessage).toHaveBeenCalledWith({ type: 'upload_progress', payload: testData });
    }

    // analysis_complete イベントをシミュレート
    const analysisCompleteHandler = mockSocket.on.mock.calls.find(call => call[0] === 'analysis_complete')?.[1];
    if (analysisCompleteHandler) {
      const testData = { analysisId: 'test123' };
      act(() => {
        analysisCompleteHandler(testData);
      });
      expect(onMessage).toHaveBeenCalledWith({ type: 'analysis_complete', payload: testData });
    }
  });
});