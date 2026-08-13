'use client';

import React from 'react';
import { Group, Rect } from 'react-konva';

export function GridOverlay({ width, height, gridSize }: any) {
  const size = Math.max(4, Math.floor(gridSize || 40));
  const lines: React.ReactNode[] = [];
  const color = 'rgba(0,0,0,0.08)';

  for (let x = 0; x <= width; x += size) {
    lines.push(<Rect key={`gx-${x}`} x={x} y={0} width={1} height={height} fill={color} listening={false} />);
  }
  for (let y = 0; y <= height; y += size) {
    lines.push(<Rect key={`gy-${y}`} x={0} y={y} width={width} height={1} fill={color} listening={false} />);
  }

  return <Group name="grid-overlay" listening={false}>{lines}</Group>;
}
