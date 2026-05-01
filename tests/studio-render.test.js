import { describe, expect, it } from 'vitest';
import { buildFfmpegArgs } from '../lib/studio/render.js';

describe('studio render ffmpeg args', () => {
  it('preserves preview cue timing controls in the render filter graph', () => {
    const args = buildFfmpegArgs({
      mediaPath: 'source.mp4',
      outputPath: 'render.mp4',
      outputType: 'video',
      outputFormat: 'mp4',
      cueAssets: [{
        filePath: 'cue.wav',
        cue: {
          renderTime: 1.25,
          volume: 0.6,
          trimStart: 0.4,
          duration: 2.5,
          playbackRate: 1.25,
          fadeIn: 0.2,
          fadeOut: 0.5,
          repeatMode: 'loop',
        },
      }],
    });

    const filter = args[args.indexOf('-filter_complex') + 1];

    expect(args).toContain('-stream_loop');
    expect(filter).toContain('atrim=start=0.4');
    expect(filter).toContain('atempo=1.25');
    expect(filter).toContain('atrim=duration=2.5');
    expect(filter).toContain('volume=0.600');
    expect(filter).toContain('afade=t=in:st=0:d=0.2');
    expect(filter).toContain('afade=t=out:st=2:d=0.5');
    expect(filter).toContain('adelay=1250:all=1');
  });
});
