import { NextResponse } from 'next/server';
import { logTtsCall } from '@/lib/coaching/cost-logger';

interface TTSRequest {
  text: string;
  voice: 'male' | 'female';
}

// ElevenLabs PREMADE voices — these work on all tiers including free
const VOICE_ID_MAP: Record<'male' | 'female', string> = {
  male: 'CwhRBWXzGAHq8TQ4Fs17',   // Roger — Laid-Back, Casual, Resonant
  female: 'EXAVITQu4vr4xnSDxMaL',  // Sarah — Mature, Reassuring, Confident
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TTSRequest;
    const { text, voice } = body;

    // Validate inputs
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required and must be a string' },
        { status: 400 },
      );
    }

    if (!voice || (voice !== 'male' && voice !== 'female')) {
      return NextResponse.json(
        { error: 'voice must be either "male" or "female"' },
        { status: 400 },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured in .env.local' },
        { status: 500 },
      );
    }

    const voiceId = VOICE_ID_MAP[voice];
    const startMs = Date.now();

    // Use eleven_flash_v2_5 — fast, high quality, works on all tiers
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs API error:', ttsResponse.status, errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${ttsResponse.status}`, details: errorText },
        { status: ttsResponse.status },
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // Log TTS cost
    logTtsCall({
      inputChars: text.length,
      audioBytes: audioBuffer.byteLength,
      latencyMs: Date.now() - startMs,
    });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error in TTS endpoint:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
