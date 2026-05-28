import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>x</Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and children when open', () => {
    render(
      <Modal isOpen onClose={() => {}} title="My Modal">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole('heading', { name: 'My Modal' })).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal isOpen onClose={onClose}>x</Modal>);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the inner content does NOT close', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose}><p data-testid="body">x</p></Modal>);
    fireEvent.click(screen.getByTestId('body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicking the X button closes', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="T">x</Modal>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
