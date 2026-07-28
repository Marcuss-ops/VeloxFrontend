// Text effects renderer for the Dark Editor canvas.
//
// Owns the TextEffectsRenderer class + its module-level singleton.
// Methods paint text decorations (shadow, stroke, gradient, curve)
// onto a pooled HTMLCanvasElement.
//
// Originally co-located with ShapeEffectsRenderer +
// canvasPool singleton in lib/advancedEffects.ts; extracted here so
// text-only effects (used by the editor text renderer) do not have
// to evaluate the shape-renderer code path.

import { canvasPool } from './canvasPool';
import type {
  TextShadow,
  TextStroke,
  TextGradient,
  TextCurve,
} from './types';

// ------------------------------------------------------------------
// TextEffectsRenderer — paints shadow / stroke / gradient / curve
// decorations onto a pooled HTMLCanvasElement.
// ------------------------------------------------------------------

export class TextEffectsRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = canvasPool.acquire();
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Apply text shadow
  applyTextShadow(
    text: string,
    font: string,
    color: string,
    shadow: TextShadow
  ): HTMLCanvasElement {
    const metrics = this.measureText(text, font);
    const padding = Math.max(Math.abs(shadow.offsetX), Math.abs(shadow.offsetY), shadow.blur) + 20;

    this.canvas.width = metrics.width + padding * 2;
    this.canvas.height = metrics.actualHeight + padding * 2;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw shadow
    this.ctx.save();
    this.ctx.translate(padding + shadow.offsetX, padding + shadow.offsetY);
    this.ctx.fillStyle = shadow.color;
    this.ctx.shadowBlur = shadow.blur;
    this.ctx.shadowColor = shadow.color;
    this.ctx.font = font;
    this.ctx.fillText(text, 0, metrics.actualHeight);
    this.ctx.restore();

    // Draw main text
    this.ctx.save();
    this.ctx.translate(padding, padding);
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, 0, metrics.actualHeight);
    this.ctx.restore();

    return this.canvas;
  }

  // Apply text stroke
  applyTextStroke(
    text: string,
    font: string,
    color: string,
    stroke: TextStroke
  ): HTMLCanvasElement {
    const metrics = this.measureText(text, font);
    const padding = stroke.width + 10;

    this.canvas.width = metrics.width + padding * 2;
    this.canvas.height = metrics.actualHeight + padding * 2;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(padding, padding);
    this.ctx.font = font;
    this.ctx.lineWidth = stroke.width;
    this.ctx.strokeStyle = stroke.color;
    this.ctx.fillStyle = color;
    this.ctx.strokeText(text, 0, metrics.actualHeight);
    this.ctx.fillText(text, 0, metrics.actualHeight);
    this.ctx.restore();

    return this.canvas;
  }

  // Apply text gradient
  applyTextGradient(
    text: string,
    font: string,
    gradient: TextGradient
  ): HTMLCanvasElement {
    const metrics = this.measureText(text, font);
    const padding = 10;

    this.canvas.width = metrics.width + padding * 2;
    this.canvas.height = metrics.actualHeight + padding * 2;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(padding, padding);
    this.ctx.font = font;

    const grad = this.createGradient(gradient, metrics.width, metrics.actualHeight);
    this.ctx.fillStyle = grad;
    this.ctx.fillText(text, 0, metrics.actualHeight);
    this.ctx.restore();

    return this.canvas;
  }

  // Apply text curve
  applyTextCurve(
    text: string,
    font: string,
    color: string,
    curve: TextCurve
  ): HTMLCanvasElement {
    if (!curve.enabled || curve.radius <= 0) {
      return this.simpleText(text, font, color);
    }

    const metrics = this.measureText(text, font);
    const padding = curve.radius + 50;

    this.canvas.width = metrics.width + padding * 2;
    this.canvas.height = metrics.actualHeight + padding * 2 + curve.radius;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(padding, padding + curve.radius);
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';

    // Draw curved text
    const centerX = metrics.width / 2;
    const centerY = curve.direction === 'up' ? -curve.radius : curve.radius;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, curve.radius, 0, Math.PI * 2);
    this.ctx.clip();

    // Draw text along curve path
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charMetrics = this.measureText(char, font);
      const angle = (i / text.length) * Math.PI;
      const x = centerX + Math.cos(angle) * curve.radius;
      const y = centerY + Math.sin(angle) * curve.radius;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle);
      this.ctx.fillText(char, -charMetrics.width / 2, 0);
      this.ctx.restore();
    }

    this.ctx.restore();
    this.ctx.restore();

    return this.canvas;
  }

  // Simple text rendering
  private simpleText(text: string, font: string, color: string): HTMLCanvasElement {
    const metrics = this.measureText(text, font);
    const padding = 10;

    this.canvas.width = metrics.width + padding * 2;
    this.canvas.height = metrics.actualHeight + padding * 2;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(padding, padding);
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, 0, metrics.actualHeight);
    this.ctx.restore();

    return this.canvas;
  }

  // Measure text
  private measureText(text: string, font: string): { width: number; actualHeight: number } {
    this.ctx.font = font;
    const metrics = this.ctx.measureText(text);
    return {
      width: metrics.width,
      actualHeight: 24 // Approximate height, could be calculated more precisely
    };
  }

  // Create gradient
  private createGradient(gradient: TextGradient, width: number, height: number) {
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
}

// Singleton — kept stable so callers depending on a shared renderer
// (e.g. the convenience wrappers in lib/effects/appliers.ts) keep
// their existing instance after the extraction.
export const textEffectsRenderer = new TextEffectsRenderer();
