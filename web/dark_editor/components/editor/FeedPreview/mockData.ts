// FeedPreview/mockData.ts — Mock competitor videos for the social-feed
// preview simulator (FeedPreviewDialog.tsx). Pure data constant. Extracted
// from FeedPreviewDialog.tsx (commit 1 of 4 in the editor-ui refactor
// series). Forkable for future tests. Element type is inferred at this
// commit; the DesktopFeed / MobileFeed sub-components introduced in later
// commits will declare their own typed prop interfaces when they consume
// this const.

// Mock competitor videos: the desktop grid renders all 3, the mobile
// simulator renders the first 2 via .slice(0, 2).
export const mockCompetitors = [
  {
    id: 1,
    thumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60',
    title: 'Why I Left the Amish Community - Inside Story',
    channel: 'True Stories Documentaries',
    views: '1.2M views',
    time: '1 year ago',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 2,
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=60',
    title: 'Surviving 24 Hours in a Remote Forest with Nothing',
    channel: 'Wilderness Survival',
    views: '654K views',
    time: '2 weeks ago',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=60',
  },
  {
    id: 3,
    thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=60',
    title: 'The Silent Life: Inside a Modern Monastery',
    channel: 'Spirit Quest',
    views: '98K views',
    time: '5 days ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
  },
];
