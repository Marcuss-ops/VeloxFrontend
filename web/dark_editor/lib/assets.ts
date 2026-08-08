export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'shape' | 'svg';
  src?: string;
  path?: string; // for SVGs
  category: 'arrows' | 'shapes' | 'social' | 'badges' | 'effects';
}

export const ASSETS: Asset[] = [
  // Arrows
  { id: 'arrow-1', name: 'Curved Arrow', type: 'image', src: '/assets/arrows/curved-arrow.png', category: 'arrows' },
  { id: 'arrow-2', name: 'Straight Arrow', type: 'image', src: '/assets/arrows/straight-arrow.png', category: 'arrows' },
  
  // Shapes
  { id: 'shape-star', name: 'Star', type: 'shape', category: 'shapes' },
  { id: 'shape-triangle', name: 'Triangle', type: 'shape', category: 'shapes' },
  
  // Social
  { id: 'social-yt', name: 'YouTube Icon', type: 'image', src: '/assets/social/youtube.png', category: 'social' },
  { id: 'social-ig', name: 'Instagram Icon', type: 'image', src: '/assets/social/instagram.png', category: 'social' },
  
  // Effects
  { id: 'effect-glow', name: 'Glow Effect', type: 'image', src: '/assets/effects/glow.png', category: 'effects' },
  { id: 'effect-burst', name: 'Burst Effect', type: 'image', src: '/assets/effects/burst.png', category: 'effects' },
];
