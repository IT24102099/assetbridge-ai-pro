import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, LoadingState, ErrorState } from '../FeedbackStates';

describe('FeedbackStates Components', () => {
  it('renders LoadingState with default and custom message', () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();

    rerender(<LoadingState message="Fetching property records..." />);
    expect(screen.getByText('Fetching property records...')).toBeInTheDocument();
  });

  it('renders ErrorState with message and invokes onRetry callback', () => {
    const mockRetry = vi.fn();
    render(<ErrorState message="Server connection timed out" onRetry={mockRetry} />);

    expect(screen.getByText('Communication Error')).toBeInTheDocument();
    expect(screen.getByText('Server connection timed out')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders EmptyState with title, description, and action button', () => {
    const mockAction = vi.fn();
    render(
      <EmptyState
        title="No Properties Found"
        description="Get started by adding your first overseas residential asset."
        actionText="Add New Asset"
        onAction={mockAction}
      />
    );

    expect(screen.getByText('No Properties Found')).toBeInTheDocument();
    expect(screen.getByText('Get started by adding your first overseas residential asset.')).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: /Add New Asset/i });
    fireEvent.click(actionBtn);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });
});
