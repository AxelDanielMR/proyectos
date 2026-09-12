import { useRef } from 'react';

// Keeps a ref pointing at the latest value across renders. Use it so an
// effect can call the current version of a prop/callback (e.g. `onReveal`,
// `finish`) without needing that value in its dependency array — the effect
// itself should only re-run when *other* deps (like `phase`) change, not
// whenever the caller happens to pass a new function identity.
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
