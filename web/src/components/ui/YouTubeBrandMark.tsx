import React from 'react';

interface YouTubeBrandMarkProps {
    size?: number;
    variant?: 'red' | 'black' | 'white';
    className?: string;
}

const palette = {
    red: {
        container: '#FF0033',
        play: '#FFFFFF',
        border: 'rgba(255, 255, 255, 0.08)',
    },
    black: {
        container: '#000000',
        play: '#FFFFFF',
        border: 'rgba(255, 255, 255, 0.08)',
    },
    white: {
        container: '#FFFFFF',
        play: '#000000',
        border: 'rgba(15, 23, 42, 0.18)',
    },
} as const;

export const YouTubeBrandMark: React.FC<YouTubeBrandMarkProps> = () => {
    return null;
};

export default YouTubeBrandMark;
