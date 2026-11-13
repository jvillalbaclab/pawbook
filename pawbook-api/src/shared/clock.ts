/** Reloj inyectable: el dominio nunca llama a `Date.now()` directamente, así los tests controlan el tiempo. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Reloj fijo para tests. `advance` permite simular el paso del tiempo. */
export function fixedClock(start: Date): Clock & { advance(ms: number): void } {
  let current = start.getTime();
  return {
    now: () => new Date(current),
    advance: (ms) => {
      current += ms;
    },
  };
}
