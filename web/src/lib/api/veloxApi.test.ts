import { describe, it, expect } from 'vitest';
import { getDeliveryEventTimeline } from './veloxApi';

describe('getDeliveryEventTimeline', () => {
  it('marks artifact_verified as active with no prior completed events', () => {
    const events = getDeliveryEventTimeline('artifact_verified');
    expect(events.map((e) => ({ key: e.key, completed: e.completed, active: e.active }))).toEqual([
      { key: 'artifact_verified', completed: true, active: true },
      { key: 'queued', completed: false, active: false },
      { key: 'publishing', completed: false, active: false },
      { key: 'published', completed: false, active: false },
    ]);
  });

  it('marks queued as active and artifact_verified as completed', () => {
    const events = getDeliveryEventTimeline('queued');
    expect(events.map((e) => ({ key: e.key, completed: e.completed, active: e.active }))).toEqual([
      { key: 'artifact_verified', completed: true, active: false },
      { key: 'queued', completed: true, active: true },
      { key: 'publishing', completed: false, active: false },
      { key: 'published', completed: false, active: false },
    ]);
  });

  it('marks publishing as active and all prior steps as completed', () => {
    const events = getDeliveryEventTimeline('publishing');
    expect(events.map((e) => ({ key: e.key, completed: e.completed, active: e.active }))).toEqual([
      { key: 'artifact_verified', completed: true, active: false },
      { key: 'queued', completed: true, active: false },
      { key: 'publishing', completed: true, active: true },
      { key: 'published', completed: false, active: false },
    ]);
  });

  it('maps waiting_provider to the publishing step', () => {
    const events = getDeliveryEventTimeline('waiting_provider');
    expect(events.map((e) => ({ key: e.key, completed: e.completed, active: e.active }))).toEqual([
      { key: 'artifact_verified', completed: true, active: false },
      { key: 'queued', completed: true, active: false },
      { key: 'publishing', completed: true, active: true },
      { key: 'published', completed: false, active: false },
    ]);
  });

  it('marks all pipeline events as completed for published', () => {
    const events = getDeliveryEventTimeline('published');
    expect(events.map((e) => ({ key: e.key, completed: e.completed, active: e.active }))).toEqual([
      { key: 'artifact_verified', completed: true, active: false },
      { key: 'queued', completed: true, active: false },
      { key: 'publishing', completed: true, active: false },
      { key: 'published', completed: true, active: false },
    ]);
  });

  it('appends a synthetic failed event for terminal failure statuses', () => {
    const failureStatuses = ['failed', 'blocked_auth', 'dead_letter'] as const;
    for (const status of failureStatuses) {
      const events = getDeliveryEventTimeline(status);
      const failed = events[events.length - 1];
      expect(failed.key).toBe('failed');
      expect(failed.active).toBe(true);
      expect(failed.completed).toBe(false);
      // All pipeline events should remain uncompleted.
      expect(events.slice(0, -1).every((e) => !e.completed)).toBe(true);
    }
  });

  it('treats unknown statuses as pending (no completed or active events)', () => {
    const events = getDeliveryEventTimeline('unknown_status');
    expect(events.every((e) => !e.completed && !e.active)).toBe(true);
  });
});
