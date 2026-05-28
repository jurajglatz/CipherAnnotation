import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Delete?',
  message: 'Are you sure?',
};

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    render(<ConfirmDialog {...baseProps} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Delete?' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('confirm and cancel buttons fire their callbacks', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        onConfirm={onConfirm}
        onClose={onClose}
        confirmText="Delete"
        cancelText="Keep"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "Loading..." and disables buttons when isLoading', () => {
    render(
      <ConfirmDialog
        {...baseProps}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        confirmText="Go"
        isLoading
      />,
    );
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
  });

  it('applies the danger styling on the confirm button when isDangerous', () => {
    render(
      <ConfirmDialog
        {...baseProps}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        confirmText="Delete"
        isDangerous
      />,
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('cipher-red');
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        {...baseProps}
        isOpen={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
