import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('merges simple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional class values', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar');
  });

  it('resolves tailwind-merge conflicts', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false && 'bar', null, undefined, 'baz')).toBe('foo baz');
  });
});
