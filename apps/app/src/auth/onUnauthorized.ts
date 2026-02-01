// Bridge so API client can notify auth context on 401 (no hooks in client).
let listener: (() => void) | null = null;

export function setOnUnauthorized(cb: (() => void) | null) {
  listener = cb;
}

export function notifyUnauthorized() {
  listener?.();
}
