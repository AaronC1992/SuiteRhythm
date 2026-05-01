'use client';

/**
 * NowPlayingStrip — live engine status bar pinned above main content.
 *
 * Reads reactive engine state via useEngine() and surfaces what the
 * AI director is doing RIGHT NOW: listening status, current mood,
 * active sound count, and the most recent trigger (name + the keyword
 * that fired it).
 *
 * Includes lightweight per-sound feedback for tuning matcher quality.
 */

import { useEffect, useState } from 'react';
import { useEngine } from '../lib/engine-bridge';

const MOOD_COLOR = {
    neutral:    '#9aa0ae',
    peaceful:   '#4caf87',
    calm:       '#4caf87',
    tense:      '#ffb74d',
    suspense:   '#ffb74d',
    combat:     '#ff5252',
    battle:     '#ff5252',
    dark:       '#7e57c2',
    horror:     '#b71c1c',
    mystery:    '#5c6bc0',
    heroic:     '#03dac6',
    triumph:    '#03dac6',
    sad:        '#546e7a',
    joyful:     '#ffd54f',
    magical:    '#bb86fc',
    exploration:'#26c6da',
};

function formatAgo(ts) {
    if (!ts) return '';
    const d = Date.now() - ts;
    if (d < 1500) return 'just now';
    if (d < 60_000) return `${Math.round(d / 1000)}s ago`;
    if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
    return '';
}

export default function NowPlayingStrip() {
    const { state, dispatch } = useEngine();
    const {
        connected, isListening, currentMood, activeSoundCount,
        lastTriggeredName, lastTriggeredKeyword, lastTriggeredAt,
        musicTrack,
    } = state;

    // Tick once per second so "just now / 5s ago" stays fresh even when
    // the engine state itself doesn't change.
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((n) => n + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // Flash animation on new trigger — ride on the timestamp changing.
    const [flashKey, setFlashKey] = useState(0);
    const [feedbackSent, setFeedbackSent] = useState('');
    useEffect(() => {
        if (lastTriggeredAt) {
            setFlashKey((k) => k + 1);
            setFeedbackSent('');
        }
    }, [lastTriggeredAt]);

    const recordFeedback = (rating) => {
        dispatch({ type: 'recordSoundFeedback', payload: { rating } });
        setFeedbackSent(rating);
    };

    if (!connected) {
        return (
            <div className="now-playing-strip is-idle" role="status" aria-label="Engine starting">
                <span className="np-dot is-idle" aria-hidden="true" />
                <span className="np-label">Engine warming up…</span>
            </div>
        );
    }

    const moodColor = MOOD_COLOR[currentMood] || MOOD_COLOR.neutral;
    const statusText = isListening ? 'Listening' : 'Idle';

    return (
        <div
            className={`now-playing-strip ${isListening ? 'is-listening' : 'is-idle'}`}
            role="status"
            aria-live="polite"
        >
            <div className="np-group np-status">
                <span
                    className={`np-dot ${isListening ? 'is-listening' : 'is-idle'}`}
                    aria-hidden="true"
                />
                <span className="np-label">{statusText}</span>
            </div>

            <div className="np-divider" aria-hidden="true" />

            <div className="np-group" title={`Mood: ${currentMood}`}>
                <span
                    className="np-mood-chip"
                    style={{ '--mood-color': moodColor }}
                >
                    {currentMood}
                </span>
            </div>

            <div className="np-divider" aria-hidden="true" />

            <div className="np-group np-count">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                </svg>
                <span className="np-label">
                    {activeSoundCount} <span className="np-muted">playing</span>
                </span>
            </div>

            {musicTrack && (
                <>
                    <div className="np-divider" aria-hidden="true" />
                    <div className="np-group np-music" title={`Music: ${musicTrack}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M9 18V5l12-2v13" />
                        </svg>
                        <span className="np-label np-track">{musicTrack}</span>
                    </div>
                </>
            )}

            {lastTriggeredName && (
                <>
                    <div className="np-divider" aria-hidden="true" />
                    <div
                        key={flashKey}
                        className="np-group np-last np-flash"
                        title={
                            lastTriggeredKeyword
                                ? `Fired by: "${lastTriggeredKeyword}"`
                                : undefined
                        }
                    >
                        <span className="np-muted">Last:</span>
                        <span className="np-label">{lastTriggeredName}</span>
                        {lastTriggeredKeyword && (
                            <span className="np-kw">“{lastTriggeredKeyword}”</span>
                        )}
                        <span className="np-muted np-ago">{formatAgo(lastTriggeredAt)}</span>
                        <span className="np-feedback" aria-label="Sound feedback">
                            <button
                                type="button"
                                className={`np-feedback-btn${feedbackSent === 'correct' ? ' active' : ''}`}
                                onClick={() => recordFeedback('correct')}
                                aria-label="Mark last sound correct"
                            >
                                Good
                            </button>
                            <button
                                type="button"
                                className={`np-feedback-btn${feedbackSent === 'wrong' ? ' active' : ''}`}
                                onClick={() => recordFeedback('wrong')}
                                aria-label="Mark last sound wrong"
                            >
                                Wrong
                            </button>
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
