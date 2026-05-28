import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders a single spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelectorAll('.animate-spin')).toHaveLength(1);
  });

  it('uses the size prop class', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />);
    expect(container.querySelector('.w-6')).not.toBeNull();
    rerender(<LoadingSpinner size="lg" />);
    expect(container.querySelector('.w-16')).not.toBeNull();
  });

  it('applies min-h-screen when fullHeight (default)', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.min-h-screen')).not.toBeNull();
  });

  it('omits min-h-screen when fullHeight is false', () => {
    const { container } = render(<LoadingSpinner fullHeight={false} />);
    expect(container.querySelector('.min-h-screen')).toBeNull();
  });
});
