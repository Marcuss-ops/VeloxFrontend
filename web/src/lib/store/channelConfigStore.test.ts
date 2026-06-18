/**
 * Channel Config Store Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createChannelConfig,
  mergeChannelConfig,
  channelConfigStore,
  type GroupsConfig,
} from './channelConfigStore';

describe('channelConfigStore', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await channelConfigStore.clear();
  });

  describe('save and load', () => {
    it('should save and load config', async () => {
      const config: GroupsConfig = {
        Boxe: {
          channels: [
            { id: 'ch1', name: 'Boxe_ITA', language: 'it', group: 'Boxe' },
          ],
        },
      };

      await channelConfigStore.save(config);
      const loaded = await channelConfigStore.load();

      expect(loaded).toEqual(config);
    });

    it('should return empty config when nothing saved', async () => {
      const loaded = await channelConfigStore.load();
      expect(loaded).toEqual({});
    });

    it('should handle corrupted localStorage', async () => {
      // Simulate corrupted data
      localStorage.setItem('youtube_channels_config', 'not valid json{{{');
      
      const loaded = await channelConfigStore.load();
      expect(loaded).toEqual({});
    });
  });

  describe('clear', () => {
    it('should remove config from storage', async () => {
      const config: GroupsConfig = {
        Boxe: { channels: [] },
      };

      await channelConfigStore.save(config);
      await channelConfigStore.clear();
      const loaded = await channelConfigStore.load();

      expect(loaded).toEqual({});
    });
  });
});

describe('createChannelConfig', () => {
  it('should create config with auto-detected language', () => {
    const config = createChannelConfig('ch1', 'Boxe_ITA', 'Boxe Italia', 'Boxe');

    expect(config.id).toBe('ch1');
    expect(config.name).toBe('Boxe_ITA');
    expect(config.language).toBe('it');
    expect(config.group).toBe('Boxe');
  });

  it('should default to unknown language', () => {
    const config = createChannelConfig('ch1', 'RandomChannel', '', 'Undefined');

    expect(config.language).toBe('unknown');
  });
});

describe('mergeChannelConfig', () => {
  it('should merge live channels with existing config', () => {
    const liveChannels = [
      { id: 'ch1', name: 'Boxe_ITA', title: 'Boxe Italia' },
      { id: 'ch2', name: 'Cocina_Es', title: 'Cocina España' },
      { id: 'ch3', name: 'NewChannel', title: 'New' },
    ];

    const existingConfig: GroupsConfig = {
      Boxe: {
        channels: [
          { id: 'ch1', name: 'Boxe_ITA_Old', language: 'it', group: 'Boxe' },
        ],
      },
      Cocina: {
        channels: [
          { id: 'ch2', name: 'Cocina_Es_Old', language: 'es', group: 'Cocina' },
        ],
      },
      Undefined: {
        channels: [],
      },
    };

    const merged = mergeChannelConfig(liveChannels, existingConfig);

    // Existing channel should be updated with live data
    expect(merged.Boxe.channels).toHaveLength(1);
    expect(merged.Boxe.channels[0].name).toBe('Boxe_ITA');
    expect(merged.Boxe.channels[0].title).toBe('Boxe Italia');

    // New channel should be added to Undefined
    expect(merged.Undefined.channels).toHaveLength(1);
    expect(merged.Undefined.channels[0].id).toBe('ch3');
    expect(merged.Undefined.channels[0].language).toBe('unknown');
  });

  it('should remove channels not in live data', () => {
    const liveChannels = [
      { id: 'ch1', name: 'Boxe_ITA' },
    ];

    const existingConfig: GroupsConfig = {
      Boxe: {
        channels: [
          { id: 'ch1', name: 'Boxe_ITA', language: 'it', group: 'Boxe' },
          { id: 'ch_deleted', name: 'OldChannel', language: 'en', group: 'Boxe' },
        ],
      },
    };

    const merged = mergeChannelConfig(liveChannels, existingConfig);

    expect(merged.Boxe.channels).toHaveLength(1);
    expect(merged.Boxe.channels[0].id).toBe('ch1');
  });

  it('should ensure Undefined group exists', () => {
    const liveChannels = [
      { id: 'ch1', name: 'NewChannel' },
    ];

    const existingConfig: GroupsConfig = {
      Boxe: { channels: [] },
    };

    const merged = mergeChannelConfig(liveChannels, existingConfig);

    expect(merged.Undefined).toBeDefined();
    expect(merged.Undefined.channels).toHaveLength(1);
  });
});
