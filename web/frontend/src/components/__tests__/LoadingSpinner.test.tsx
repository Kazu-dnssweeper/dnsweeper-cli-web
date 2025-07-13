import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../UI/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { hidden: true }); // divにrole="status"を追加する必要があるかも
    expect(spinner).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let container = screen.getByRole('status', { hidden: true }) || screen.getByText('', { selector: 'div' }).parentElement;
    let spinner = container?.querySelector('div');
    expect(spinner).toHaveClass('w-4 h-4');

    rerender(<LoadingSpinner size="lg" />);
    container = screen.getByRole('status', { hidden: true }) || screen.getByText('', { selector: 'div' }).parentElement;
    spinner = container?.querySelector('div');
    expect(spinner).toHaveClass('w-12 h-12');
  });

  it('renders with text', () => {
    render(<LoadingSpinner text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    const container = document.querySelector('.custom-spinner');
    expect(container).toBeInTheDocument();
  });

  it('has correct animation classes', () => {
    render(<LoadingSpinner />);
    const container = document.querySelector('.animate-spin');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('rounded-full', 'border-2');
  });
});