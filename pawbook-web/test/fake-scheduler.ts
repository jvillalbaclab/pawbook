/*
 * Reloj y temporizadores falsos para los tests: `schedule` tiene la forma que inyectan las
 * capas con esperas (disponibilidad del handle, renovación de tokens de Stream) y `advance`
 * ejecuta en orden lo que vence, sin esperas reales.
 */
export function fakeScheduler(start = 0) {
  let now = start;
  const tasks: { at: number; work: () => void; cancelled: boolean }[] = [];
  return {
    now: () => now,
    schedule(work: () => void, ms: number): () => void {
      const task = { at: now + ms, work, cancelled: false };
      tasks.push(task);
      return () => {
        task.cancelled = true;
      };
    },
    /** Tareas pendientes (no canceladas ni ejecutadas). */
    pending: () => tasks.filter((task) => !task.cancelled).map((task) => task.at - now),
    advance(ms: number): void {
      const until = now + ms;
      for (;;) {
        const due = tasks
          .filter((task) => !task.cancelled && task.at <= until)
          .sort((a, b) => a.at - b.at)[0];
        if (due === undefined) break;
        due.cancelled = true;
        now = due.at;
        due.work();
      }
      now = until;
    },
  };
}

/** Deja correr las promesas ya resueltas (microtareas y un turno de macrotareas). */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
