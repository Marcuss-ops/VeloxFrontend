import type { YouTubeGroup, YouTubeVideo } from './youtube/types';

export const DEMO_GROUPS: YouTubeGroup[] = [
  {
    name: 'Amish',
    privacy: 'private',
    count: 8,
    channels: [
      { id: 'UCBxpiPLmm3DVQAsSkpIT38g', title: 'Amish Stories', name: 'Amish Stories', language: 'en' },
      { id: 'UCmeVwZ8n1ZmaV9qJOkMP-ug', title: 'Amish Stories RU', name: 'Amish Stories RU', language: 'ru' },
      { id: 'UCizstDS8VMLQpZndBW0-ZIg', title: 'Amish Stories De', name: 'Amish Stories De', language: 'de' },
    ],
  },
  {
    name: 'Crime',
    privacy: 'private',
    count: 11,
    channels: [
      { id: 'UCAs1menLmoTs4J9KuKKduhw', title: 'Crime Today FR', name: 'Crime Today FR', language: 'fr' },
      { id: 'UCF_d420CH_By8OUbY7BBfAQ', title: 'Crime Today ITA', name: 'Crime Today ITA', language: 'it' },
      { id: 'UCp8BQpJfHRDiU8Zj7bYxDyA', title: 'Crime Today Ind', name: 'Crime Today Ind', language: 'id' },
    ],
  },
  {
    name: 'Music',
    privacy: 'private',
    count: 9,
    channels: [
      { id: 'music-demo-1', title: 'RapGameDE', name: 'RapGameDE', language: 'de' },
      { id: 'music-demo-2', title: 'RapGameEsp', name: 'RapGameEsp', language: 'es' },
      { id: 'music-demo-3', title: 'RapGameFre', name: 'RapGameFre', language: 'fr' },
    ],
  },
  {
    name: 'Pop',
    privacy: 'private',
    count: 11,
    channels: [
      { id: 'pop-demo-1', title: 'Pop Discovery', name: 'Pop Discovery', language: 'en' },
      { id: 'pop-demo-2', title: 'Pop Prim FR', name: 'Pop Prim FR', language: 'fr' },
      { id: 'pop-demo-3', title: 'Pop Prime', name: 'Pop Prime', language: 'en' },
    ],
  },
  {
    name: 'Wwe',
    privacy: 'private',
    count: 10,
    channels: [
      { id: 'wwe-demo-1', title: 'Wrestling Insider RU', name: 'Wrestling Insider RU', language: 'ru' },
      { id: 'wwe-demo-2', title: 'Wrestling Insider Tr', name: 'Wrestling Insider Tr', language: 'tr' },
      { id: 'wwe-demo-3', title: 'Wwe Insider De', name: 'Wwe Insider De', language: 'de' },
    ],
  },
  {
    name: 'boxe',
    privacy: 'private',
    count: 10,
    channels: [
      { id: 'boxe-demo-1', title: 'BoxeClub IND', name: 'BoxeClub IND', language: 'id' },
      { id: 'boxe-demo-2', title: 'BoxeClubDE', name: 'BoxeClubDE', language: 'de' },
      { id: 'boxe-demo-3', title: 'BoxeClubEs', name: 'BoxeClubEs', language: 'es' },
    ],
  },
  {
    name: 'discovery',
    privacy: 'private',
    count: 9,
    channels: [
      { id: 'disc-demo-1', title: 'Discovery World DE', name: 'Discovery World DE', language: 'de' },
      { id: 'disc-demo-2', title: 'Internet Drama Sp', name: 'Internet Drama Sp', language: 'es' },
      { id: 'disc-demo-3', title: 'Odyssey Explorers Fr', name: 'Odyssey Explorers Fr', language: 'fr' },
    ],
  },
];

export const DEMO_VIDEOS: Record<string, YouTubeVideo[]> = {
  Amish: [],
  Crime: [],
  Music: [],
  Pop: [],
  Wwe: [],
  boxe: [],
  discovery: [],
};
