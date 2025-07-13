import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Notification, useNotifications } from '../UI/Notification';
import { renderHook, act } from '@testing-library/react';

// タイマーをモック
vi.useFakeTimers();

describe('Notification Component', () => {
  const defaultProps = {
    id: 'test-notification',
    type: 'success' as const,
    title: 'Test Notification',
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders with required props', () => {
    render(<Notification {...defaultProps} />);
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
  });

  it('renders with message', () => {
    render(<Notification {...defaultProps} message="This is a test message" />);
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('renders different notification types with correct styling', () => {
    const { rerender } = render(<Notification {...defaultProps} type="success" />);
    expect(document.querySelector('.bg-success-50')).toBeInTheDocument();

    rerender(<Notification {...defaultProps} type="error" />);
    expect(document.querySelector('.bg-error-50')).toBeInTheDocument();

    rerender(<Notification {...defaultProps} type="warning" />);
    expect(document.querySelector('.bg-warning-50')).toBeInTheDocument();

    rerender(<Notification {...defaultProps} type="info" />);
    expect(document.querySelector('.bg-primary-50')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Notification {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    // アニメーション時間を待つ
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(onClose).toHaveBeenCalledWith('test-notification');
  });

  it('auto-closes after specified duration', () => {
    const onClose = vi.fn();
    render(
      <Notification 
        {...defaultProps} 
        onClose={onClose} 
        autoClose={true}
        duration={1000}
      />
    );
    
    // 1秒 + アニメーション時間を進める
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    
    expect(onClose).toHaveBeenCalledWith('test-notification');
  });

  it('does not auto-close when autoClose is false', () => {
    const onClose = vi.fn();
    render(
      <Notification 
        {...defaultProps} 
        onClose={onClose} 
        autoClose={false}
        duration={1000}
      />
    );
    
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('useNotifications Hook', () => {
  it('initializes with empty notifications array', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toEqual([]);
  });

  it('adds notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test Notification'
      });
    });
    
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: 'success',
      title: 'Test Notification',
      id: expect.any(String)
    });
  });

  it('removes notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test Notification'
      });
    });
    
    const notificationId = result.current.notifications[0].id;
    
    act(() => {
      result.current.removeNotification(notificationId);
    });
    
    expect(result.current.notifications).toHaveLength(0);
  });

  it('clears all notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test 1'
      });
      result.current.addNotification({
        type: 'error',
        title: 'Test 2'
      });
    });
    
    expect(result.current.notifications).toHaveLength(2);
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.notifications).toHaveLength(0);
  });

  it('generates unique IDs for notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.addNotification({
        type: 'success',
        title: 'Test 1'
      });
      result.current.addNotification({
        type: 'success',
        title: 'Test 2'
      });
    });
    
    const [notification1, notification2] = result.current.notifications;
    expect(notification1.id).not.toBe(notification2.id);
  });
});