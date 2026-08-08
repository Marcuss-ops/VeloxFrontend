// Advanced Effects Utilities
// Handles text and shape effects rendering

export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface TextStroke {
  width: number;
  color: string;
}

export interface TextGradient {
  type: 'linear' | 'radial';
  angle: number;
  colors: string[];
}

export interface TextCurve {
  enabled: boolean;
  radius: number;
  direction: 'up' | 'down';
}

export interface DropShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

export interface ShapeGradient {
  type: 'linear' | 'radial';
  angle: number;
  colors: string[];
}

export interface Texture {
  type: 'none' | 'noise' | 'grain' | 'paper' | 'metal';
  intensity: number;
}

// Canvas Pool to reuse elements and reduce GC pressure
class CanvasPool {
  private pool: HTMLCanvasElement[] = [];

  acquire(): HTMLCanvasElement {
    return this.pool.shift() || document.createElement('canvas');
  }

  release(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.pool.push(canvas);
  }
}

export const canvasPool = new CanvasPool();

// Text Effects Renderer
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

// Shape Effects Renderer
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

// Singleton instances
export const textEffectsRenderer = new TextEffectsRenderer();
export const shapeEffectsRenderer = new ShapeEffectsRenderer();

// Convenience functions
export function applyTextShadow(text: string, font: string, color: string, shadow: TextShadow): HTMLCanvasElement {
  return textEffectsRenderer.applyTextShadow(text, font, color, shadow);
}

export function applyTextStroke(text: string, font: string, color: string, stroke: TextStroke): HTMLCanvasElement {
  return textEffectsRenderer.applyTextStroke(text, font, color, stroke);
}

export function applyTextGradient(text: string, font: string, gradient: TextGradient): HTMLCanvasElement {
  return textEffectsRenderer.applyTextGradient(text, font, gradient);
}

export function applyTextCurve(text: string, font: string, color: string, curve: TextCurve): HTMLCanvasElement {
  return textEffectsRenderer.applyTextCurve(text, font, color, curve);
}

export function applyDropShadow(width: number, height: number, fill: string, shadow: DropShadow): HTMLCanvasElement {
  return shapeEffectsRenderer.applyDropShadow(width, height, fill, shadow);
}

export function applyShapeGradient(width: number, height: number, gradient: ShapeGradient): HTMLCanvasElement {
  return shapeEffectsRenderer.applyShapeGradient(width, height, gradient);
}

export function applyTexture(width: number, height: number, fill: string, texture: Texture): HTMLCanvasElement {
  return shapeEffectsRenderer.applyTexture(width, height, fill, texture);
}