const SPECIAL_URL_RE = /^(?:blob:|data:)/i;
const HTTP_URL_RE = /^https?:\/\//i;
const URL_BASE = 'https://suiterhythm.local';

function decodePathSegment(segment) {
    let current = String(segment || '');
    for (let i = 0; i < 3; i += 1) {
        try {
            const decoded = decodeURIComponent(current);
            if (decoded === current) break;
            current = decoded;
        } catch (_) {
            break;
        }
    }
    return current;
}

export function encodeAudioPath(path) {
    return String(path || '')
        .split('/')
        .map((segment) => encodeURIComponent(decodePathSegment(segment)))
        .join('/');
}

export function normalizeAudioUrl(input) {
    const value = String(input || '').trim();
    if (!value || SPECIAL_URL_RE.test(value)) return value;

    if (HTTP_URL_RE.test(value)) {
        try {
            const url = new URL(value);
            url.pathname = encodeAudioPath(url.pathname);
            return url.toString();
        } catch (_) {
            return encodeAudioPath(value);
        }
    }

    try {
        const hadLeadingSlash = value.startsWith('/');
        const url = new URL(value, URL_BASE);
        const encodedPath = encodeAudioPath(url.pathname);
        const path = hadLeadingSlash ? encodedPath : encodedPath.replace(/^\//, '');
        return `${path}${url.search}${url.hash}`;
    } catch (_) {
        return encodeAudioPath(value);
    }
}

export function joinAudioUrlBase(base, source) {
    const cleanedBase = String(base || '').trim().replace(/\/+$/, '');
    const cleanedSource = normalizeAudioUrl(source).replace(/^\/+/, '');
    return cleanedBase ? `${cleanedBase}/${cleanedSource}` : cleanedSource;
}
