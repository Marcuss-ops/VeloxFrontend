// @vitest-environment jsdom
//
// Publish panel format policy — asserted on RENDERED behavior, not on the
// source text. The previous version read CoverPreviewSection.tsx from disk
// and matched literal strings (PNG / senza perdita / absence of WebP|JPEG|
// quality|<Select|<Slider>), so an innocuous comment mentioning "JPEG" would
// turn it red while a broken component rendering a hardcoded card would keep
// it green. This renders the real component and asserts what the operator
// actually sees.

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverPreviewSection } from '@/components/editor/export/CoverPreviewSection';

function renderSection(overrides: Partial<React.ComponentProps<typeof CoverPreviewSection>> = {}) {
  const props: React.ComponentProps<typeof CoverPreviewSection> = {
    hasSelection: false,
    selectedOnly: false,
    setSelectedOnly: () => {},
    showCoverPreview: false,
    setShowCoverPreview: () => {},
    coverPreviewUrl: '',
    snapshotStale: false,
    ...overrides,
  };
  return render(<CoverPreviewSection {...props} />);
}

describe('Publish panel format policy (behavior)', () => {
  it('shows the fixed YouTube preset card with a lossless PNG format', () => {
    renderSection();

    expect(screen.getByText('Preset YouTube')).toBeTruthy();
    expect(screen.getByText('1920 × 1080 · pronto per le copertine')).toBeTruthy();
    expect(screen.getByText('16:9')).toBeTruthy();
    expect(screen.getByText('Formato fisso')).toBeTruthy();
    expect(screen.getByText('PNG · senza perdita')).toBeTruthy();
  });

  it('offers no format or quality controls', () => {
    const { container } = renderSection();

    // No native select / range inputs, and no Radix Select/Slider widgets.
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('input[type="range"]')).toBeNull();
    expect(container.querySelector('[role="combobox"]')).toBeNull();
    expect(container.querySelector('[role="slider"]')).toBeNull();

    // No alternative-format or quality wording in the rendered output.
    expect(container.textContent).not.toMatch(/WebP|JPEG|Qualità|quality/i);
  });
});
