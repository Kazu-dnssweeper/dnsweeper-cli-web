import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../UI/Card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card>Card content</Card>);
      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('bg-white', 'rounded-xl', 'p-4'); // default padding
    });

    it('renders with different padding', () => {
      const { rerender } = render(<Card padding="none">No padding</Card>);
      expect(screen.getByText('No padding')).not.toHaveClass('p-4');

      rerender(<Card padding="lg">Large padding</Card>);
      expect(screen.getByText('Large padding')).toHaveClass('p-6');
    });

    it('renders with different shadows', () => {
      const { rerender } = render(<Card shadow="none">No shadow</Card>);
      expect(screen.getByText('No shadow')).not.toHaveClass('shadow-sm');

      rerender(<Card shadow="lg">Large shadow</Card>);
      expect(screen.getByText('Large shadow')).toHaveClass('shadow-lg');
    });

    it('applies custom className', () => {
      render(<Card className="custom-card">Custom</Card>);
      expect(screen.getByText('Custom')).toHaveClass('custom-card');
    });
  });

  describe('CardHeader', () => {
    it('renders with border bottom', () => {
      render(<CardHeader>Header content</CardHeader>);
      const header = screen.getByText('Header content');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('border-b', 'pb-4', 'mb-4');
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-lg', 'font-semibold');
    });

    it('renders with custom heading level', () => {
      render(<CardTitle as="h1">H1 Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('renders with correct styling', () => {
      render(<CardContent>Content</CardContent>);
      const content = screen.getByText('Content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('text-gray-600');
    });
  });

  describe('CardFooter', () => {
    it('renders with border top', () => {
      render(<CardFooter>Footer content</CardFooter>);
      const footer = screen.getByText('Footer content');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('border-t', 'pt-4', 'mt-4');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders all components together', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            This is the content of the card.
          </CardContent>
          <CardFooter>
            Footer content here
          </CardFooter>
        </Card>
      );

      expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument();
      expect(screen.getByText('This is the content of the card.')).toBeInTheDocument();
      expect(screen.getByText('Footer content here')).toBeInTheDocument();
    });
  });
});