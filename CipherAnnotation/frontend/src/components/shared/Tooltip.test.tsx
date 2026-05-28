import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  it('renders its children', () => {
    render(<Tooltip label="hi"><button>OK</button></Tooltip>);
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('renders the label inside role="tooltip"', () => {
    render(<Tooltip label="hello"><span>x</span></Tooltip>);
    expect(screen.getByRole('tooltip')).toHaveTextContent('hello');
  });

  it('applies the bottom position class by default', () => {
    render(<Tooltip label="x"><span>x</span></Tooltip>);
    expect(screen.getByRole('tooltip').className).toContain('top-full');
  });

  it('applies the requested position class', () => {
    render(<Tooltip label="x" position="left"><span>x</span></Tooltip>);
    expect(screen.getByRole('tooltip').className).toContain('right-full');
  });
});
