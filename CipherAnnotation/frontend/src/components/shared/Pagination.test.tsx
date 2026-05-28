import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('renders prev/next and a numeric range for small page counts', () => {
    render(
      <Pagination currentPage={1} totalItems={30} pageSize={10} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('disables Next on the last page', () => {
    render(
      <Pagination currentPage={3} totalItems={30} pageSize={10} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('fires onPageChange when a page number is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={1} totalItems={30} pageSize={10} onPageChange={onPageChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('fires onPageChange when Prev / Next are clicked', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={2} totalItems={30} pageSize={10} onPageChange={onPageChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('shows ellipses for large page counts', () => {
    render(
      <Pagination currentPage={6} totalItems={200} pageSize={10} onPageChange={() => {}} />,
    );
    const ellipses = screen.getAllByText('…');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
  });

  it('renders the page-size selector only when onPageSizeChange is provided and fires it', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalItems={100}
        pageSize={12}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Items per page' });
    fireEvent.change(select, { target: { value: '24' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(24);
  });

  it('shows "0 of 0" when totalItems is 0', () => {
    render(
      <Pagination currentPage={1} totalItems={0} pageSize={10} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
