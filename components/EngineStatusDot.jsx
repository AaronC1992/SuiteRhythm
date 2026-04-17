'use client';

/**
 * EngineStatusDot — tiny live-status indicator for the sidebar.
 *
 * Shows one of four states:
 *   - offline   (grey)   engine hasn't connected yet
 *   - idle      (blue)   engine loaded, mic off
 *   - listening (green)  actively transcribing
 *   - playing   (purple) listening + at least one sound active
 */

import { useEngine } from '../lib/engine-bridge';

export default function EngineStatusDot() {
    const { state } = useEngine();
    const { connected, isListening, activeSoundCount } = state;

    let status = 'offline';
    let label  = 'Offline';
    if (connected) {
        if (isListening && activeSoundCount > 0) { status = 'playing';   label = 'Playing'; }
        else if (isListening)                    { status = 'listening'; label = 'Listening'; }
        else                                     { status = 'idle';      label = 'Idle'; }
    }

    return (
        <span
            className={`engine-status engine-status-${status}`}
            role="status"
            aria-label={`Engine status: ${label}`}
            title={label}
        >
            <span className="engine-status-dot" aria-hidden="true" />
            <span className="engine-status-label">{label}</span>
        </span>
    );
}
