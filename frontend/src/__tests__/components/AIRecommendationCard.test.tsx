import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { AIRecommendationCard } from '../../components/AIRecommendationCard';
import type { ReasoningOutput } from '@/types';

describe('AIRecommendationCard', () => {
  it('renders multilingual alerts with correct lang and dir attributes', async () => {
    const recommendation: ReasoningOutput = {
      zoneId: 'zone-a',
      severity: 'moderate',
      recommendation: 'Test recommendation',
      reasoning: 'Test reasoning',
      confidence: 0.8,
      suggestedActions: ['Action 1'],
      multilingualAlerts: {
        'en': 'Hello',
        'ar': 'مرحبا',
      }
    };
    
    render(<AIRecommendationCard recommendation={recommendation} />);
    
    // Expand multilingual section
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /Multilingual alert preview/i });
    await user.click(button);
    
    const enText = screen.getByText('Hello');
    expect(enText).toHaveAttribute('lang', 'en');
    expect(enText).toHaveAttribute('dir', 'ltr');
    
    const arText = screen.getByText('مرحبا');
    expect(arText).toHaveAttribute('lang', 'ar');
    expect(arText).toHaveAttribute('dir', 'rtl');

    // Expand reasoning section
    const whyButton = screen.getByRole('button', { name: /Why this recommendation\?/i });
    await user.click(whyButton);
    expect(screen.getByText('Test reasoning')).toBeInTheDocument();

    // Click suggested action
    const actionButton = screen.getByRole('button', { name: /Action 1/i });
    await user.click(actionButton);
  });

  it('renders loading state', () => {
    render(<AIRecommendationCard recommendation={null} isLoading={true} />);
    expect(screen.getByText('AI Recommendation')).toBeInTheDocument();
  });

  it('renders empty state when no recommendation', () => {
    render(<AIRecommendationCard recommendation={null} isLoading={false} />);
    expect(screen.getByText(/No zones exceeding threshold/i)).toBeInTheDocument();
  });
});

