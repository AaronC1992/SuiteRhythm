/**
 * GET /api/sounds
 * Returns the full sound catalog from Supabase.
 * Falls back to static file if Supabase is unreachable.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { getStaticSoundsForApi } from '../../../lib/server-catalog.js';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sounds')
      .select('type, name, file, keywords, loop')
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ sounds: data ?? [] });
  } catch (err) {
    console.warn('[/api/sounds] Supabase unavailable, using static catalog:', err?.message || err);
    try {
      return NextResponse.json({ sounds: getStaticSoundsForApi(), source: 'static' });
    } catch (fallbackErr) {
      console.error('[/api/sounds] Static fallback failed:', fallbackErr);
      return NextResponse.json({ error: 'Failed to load sound catalog' }, { status: 500 });
    }
  }
}
