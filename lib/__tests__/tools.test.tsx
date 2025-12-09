/**
 * Tests for tool View components
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { weatherTool, searchTool, counterTool } from '../tools';

describe('Tool View Components', () => {
  describe('weatherTool.View', () => {
    it('renders loading state', () => {
      const { View } = weatherTool;
      render(<View data={null} loading={true} />);

      expect(screen.getByText('Fetching weather...')).toBeInTheDocument();
    });

    it('renders error state', () => {
      const { View } = weatherTool;
      const error = new Error('Failed to fetch weather');
      render(<View data={null} error={error} />);

      expect(screen.getByText('Failed to fetch weather')).toBeInTheDocument();
    });

    it('renders weather data', () => {
      const { View } = weatherTool;
      const data = { temp: 25, city: 'London', condition: 'sunny' };
      render(<View data={data} />);

      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('25°')).toBeInTheDocument();
      expect(screen.getByText('sunny')).toBeInTheDocument();
    });

    it('renders null when no data and not loading', () => {
      const { View } = weatherTool;
      const { container } = render(<View data={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('searchTool.View', () => {
    it('renders loading state', () => {
      const { View } = searchTool;
      render(<View data={null} loading={true} />);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('renders search results', () => {
      const { View } = searchTool;
      const data = {
        results: [
          { id: 1, title: 'Result 1', score: 0.95 },
          { id: 2, title: 'Result 2', score: 0.87 },
        ],
      };
      render(<View data={data} />);

      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('Result 1')).toBeInTheDocument();
      expect(screen.getByText('Result 2')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('87%')).toBeInTheDocument();
    });

    it('renders null when no data and not loading', () => {
      const { View } = searchTool;
      const { container } = render(<View data={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('counterTool.View', () => {
    it('renders loading state when no data', () => {
      const { View } = counterTool;
      render(<View data={null} loading={true} />);

      expect(screen.getByText('Creating counter...')).toBeInTheDocument();
    });

    it('renders error state', () => {
      const { View } = counterTool;
      const error = new Error('Counter error');
      render(<View data={null} error={error} />);

      expect(screen.getByText('Counter error')).toBeInTheDocument();
    });

    it('renders counter value', () => {
      const { View } = counterTool;
      const data = {
        name: 'score',
        value: 42,
        action: 'get',
        previousValue: 42,
      };
      render(<View data={data} />);

      expect(screen.getByText('score')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows diff when value changes', () => {
      const { View } = counterTool;
      const data = {
        name: 'score',
        value: 45,
        action: 'increment',
        previousValue: 42,
      };
      render(<View data={data} />);

      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('renders action buttons when onAction is provided', () => {
      const { View } = counterTool;
      const onAction = jest.fn();
      const data = {
        name: 'score',
        value: 10,
        action: 'get',
        previousValue: 10,
      };
      render(<View data={data} onAction={onAction} />);

      expect(screen.getByText('−1')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByText('+5')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('calls onAction when increment button is clicked', async () => {
      const { View } = counterTool;
      const onAction = jest.fn();
      const data = {
        name: 'score',
        value: 10,
        action: 'get',
        previousValue: 10,
      };
      render(<View data={data} onAction={onAction} />);

      const incrementButton = screen.getByText('+1');
      fireEvent.click(incrementButton);

      expect(onAction).toHaveBeenCalledWith({
        name: 'score',
        action: 'increment',
        amount: 1,
      });
    });

    it('calls onAction when decrement button is clicked', async () => {
      const { View } = counterTool;
      const onAction = jest.fn();
      const data = {
        name: 'score',
        value: 10,
        action: 'get',
        previousValue: 10,
      };
      render(<View data={data} onAction={onAction} />);

      const decrementButton = screen.getByText('−1');
      fireEvent.click(decrementButton);

      expect(onAction).toHaveBeenCalledWith({
        name: 'score',
        action: 'decrement',
        amount: 1,
      });
    });

    it('calls onAction when reset button is clicked', async () => {
      const { View } = counterTool;
      const onAction = jest.fn();
      const data = {
        name: 'score',
        value: 10,
        action: 'get',
        previousValue: 10,
      };
      render(<View data={data} onAction={onAction} />);

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      expect(onAction).toHaveBeenCalledWith({
        name: 'score',
        action: 'reset',
      });
    });

    it('disables buttons when loading', () => {
      const { View } = counterTool;
      const onAction = jest.fn();
      const data = {
        name: 'score',
        value: 10,
        action: 'get',
        previousValue: 10,
      };
      render(<View data={data} onAction={onAction} loading={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('does not render action buttons when onAction is not provided', () => {
      const { View } = counterTool;
      const data = {
        name: 'score',
        value: 10,
        action: 'get',
        previousValue: 10,
      };
      render(<View data={data} />);

      expect(screen.queryByText('−1')).not.toBeInTheDocument();
      expect(screen.queryByText('+1')).not.toBeInTheDocument();
    });

    it('shows opacity when loading with data', () => {
      const { View } = counterTool;
      const data = {
        name: 'score',
        value: 10,
        action: 'get',
        previousValue: 10,
      };
      const { container } = render(<View data={data} loading={true} />);

      const card = container.querySelector('.opacity-50');
      expect(card).toBeInTheDocument();
    });
  });
});

