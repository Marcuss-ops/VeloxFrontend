// Shape effects renderer for the Dark Editor canvas.
//
// Owns the ShapeEffectsRenderer class + its module-level singleton.
// Methods paint shape decorations (drop shadow, gradient, texture
// overlays such as noise / grain / paper / metal) onto a pooled
// HTMLCanvasElement.
//
// Originally co-located with TextEffectsRenderer +
// canvasPool singleton in lib/advancedEffects.ts; extracted here so
// shape-only effects (used by the prop-shape renderer) do not have
// to evaluate the text-renderer code path.

import { canvasPool } from './canvasPool';
import type {
  DropShadow,
  ShapeGradient,
  Texture,
} from './types';

// ------------------------------------------------------------------
// ShapeEffectsRenderer — paints drop shadow / gradient / texture
// overlays (noise / grain / paper / metal) onto a pooled
// HTMLCanvasElement.
// ------------------------------------------------------------------

export class ShapeEffectsRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = canvasPool.acquire();
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Apply drop shadow to shape
  applyDropShadow(
    width: number,
    height: number,
    fill: string,
    shadow: DropShadow
  ): HTMLCanvasElement {
    const padding = Math.max(Math.abs(shadow.offsetX), Math.abs(shadow.offsetY), shadow.blur, shadow.spread) + 10;

    this.canvas.width = width + padding * 2;
    this.canvas.height = height + padding * 2;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw shadow
    this.ctx.save();
    this.ctx.translate(padding + shadow.offsetX, padding + shadow.offsetY);
    this.ctx.shadowBlur = shadow.blur;
    this.ctx.shadowColor = shadow.color;
    this.ctx.fillStyle = shadow.color;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();

    // Draw main shape
    this.ctx.save();
    this.ctx.translate(padding, padding);
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();

    return this.canvas;
  }

  // Apply gradient to shape
  applyShapeGradient(
    width: number,
    height: number,
    gradient: ShapeGradient
  ): HTMLCanvasElement {
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const grad = this.createGradient(gradient, width, height);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);

    return this.canvas;
  }

  // Apply texture to shape
  applyTexture(
    width: number,
    height: number,
    fill: string,
    texture: Texture
  ): HTMLCanvasElement {
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw base fill
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(0, 0, width, height);

    // Apply texture overlay
    if (texture.type !== 'none' && texture.intensity > 0) {
      this.drawTexture(width, height, texture);
    }

    return this.canvas;
  }

  // Create gradient
  private createGradient(gradient: ShapeGradient, width: number, height: number) {
    let grad;

    if (gradient.type === 'linear') {
      const angle = (gradient.angle * Math.PI) / 180;
      const x1 = Math.cos(angle) * width / 2;
      const y1 = Math.sin(angle) * height / 2;
      grad = this.ctx.createLinearGradient(width / 2 - x1, height / 2 - y1, width / 2 + x1, height / 2 + y1);
    } else {
      grad = this.ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
    }

    // Add color stops
    gradient.colors.forEach((color, index) => {
      const offset = index / (gradient.colors.length - 1);
      grad.addColorStop(offset, color);
    });

    return grad;
  }

  // Draw texture overlay
  private drawTexture(width: number, height: number, texture: Texture) {
    this.ctx.save();
    this.ctx.globalAlpha = texture.intensity / 100;

    switch (texture.type) {
      case 'noise':
        this.drawNoiseTexture(width, height);
        break;
      case 'grain':
        this.drawGrainTexture(width, height);
        break;
      case 'paper':
        this.drawPaperTexture(width, height);
        break;
      case 'metal':
        this.drawMetalTexture(width, height);
        break;
    }

    this.ctx.restore();
  }

  private drawNoiseTexture(width: number, height: number) {
    const imageData = this.ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 50 - 25;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
      data[i + 3] = 255; // Alpha
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private drawGrainTexture(width: number, height: number) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < width * height * 0.1; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  private drawPaperTexture(width: number, height: number) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;

    for (let y = 0; y < height; y += 10) {
      this.ctx.beginPath();
      for (let x = 0; x < width; x += 2) {
        const offset = Math.random() * 2 - 1;
        this.ctx.lineTo(x, y + offset);
      }
      this.ctx.stroke();
    }
  }

  private drawMetalTexture(width: number, height: number) {
    const grad = this.ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, width, height);
  }
}

// Singleton — kept stable so callers depending on a shared renderer
// (e.g. the convenience wrappers in lib/effects/appliers.ts) keep
// their existing instance after the extraction.
export const shapeEffectsRenderer = new ShapeEffectsRenderer();
