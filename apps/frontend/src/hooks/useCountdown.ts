import { useState, useEffect, useRef } from "react";

/**
 * Hook to manage a countdown timer
 * @param initialSeconds - Initial countdown time in seconds
 * @returns [seconds, isActive, reset] - Current seconds, whether timer is active, and reset function
 */
export function useCountdown(initialSeconds: number): [number, boolean, () => void] {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(initialSeconds > 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (seconds > 0 && isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsActive(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [seconds, isActive]);

  const reset = (newSeconds?: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const resetSeconds = newSeconds ?? initialSeconds;
    setSeconds(resetSeconds);
    setIsActive(resetSeconds > 0);
  };

  return [seconds, isActive, reset];
}

