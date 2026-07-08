import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generateFilename, getTempDir, getTempFileUrl, getNvidiaApiKey } from '@/lib/server-utils';

export const dynamic = 'force-dynamic';

const NVIDIA_IMAGE_GEN_URL = 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium';

// POST /generate - AI image generation via NVIDIA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const apiKey = getNvidiaApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NVIDIA API key not configured. Set NVIDIA_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    // Clamp parameters
    const width = Math.max(64, Math.min(1024, body.width || 1024));
    const height = Math.max(64, Math.min(1024, body.height || 1024));
    const steps = Math.max(1, Math.min(50, body.steps || 30));

    const payload = {
      prompt: body.prompt,
      negative_prompt: 'blurry, low quality, distorted, watermark, text, logo',
      width,
      height,
      steps,
      seed: body.seed || 0,
      cfg_scale: 7.0,
      sampler: 'K_EULER_ANCESTRAL',
    };

    const response = await fetch(NVIDIA_IMAGE_GEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[generate] NVIDIA API error:', response.status, errText);
      return NextResponse.json(
        { error: 'NVIDIA API error', detail: `Status ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json() as { image?: string; artifacts?: Array<{ base64: string }> };

    // Extract base64 image from response (format varies by model)
    const base64Image = result.image || result.artifacts?.[0]?.base64;
    if (!base64Image) {
      return NextResponse.json(
        { error: 'No image returned from NVIDIA API' },
        { status: 502 }
      );
    }

    // Save to temp
    const buffer = Buffer.from(base64Image, 'base64');
    const outputFilename = generateFilename('png');
    const outputPath = path.join(getTempDir(), outputFilename);
    fs.writeFileSync(outputPath, buffer);

    return NextResponse.json({
      filename: outputFilename,
      url: getTempFileUrl(outputFilename),
      prompt: body.prompt,
    });
  } catch (error) {
    console.error('[generate] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Generation failed', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
