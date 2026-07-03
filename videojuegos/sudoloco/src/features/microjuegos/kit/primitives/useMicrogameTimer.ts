import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  cancelAnimation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Countdown UI-thread. `progress` va de 1 (lleno) a 0 (agotado) durante `durationMs`.
 * Al llegar a 0 dispara `onTimeout` exactamente una vez. Si `active` es false, no arranca.
 */
export function useMicrogameTimer(
  durationMs: number,
  onTimeout: () => void,
  active: boolean,
): SharedValue<number> {
  const progress = useSharedValue(1);
  const cbRef = useRef(onTimeout);
  cbRef.current = onTimeout;

  const fire = () => cbRef.current();

  useEffect(() => {
    if (!active) return;
    progress.value = 1;
    progress.value = withTiming(0, { duration: durationMs }, (finished) => {
      'worklet';
      if (finished) runOnJS(fire)();
    });
    return () => cancelAnimation(progress);
  }, [active, durationMs]);

  return progress;
}
