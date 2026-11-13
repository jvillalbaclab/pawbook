import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { AppError, toProblem } from "../../shared/errors";
import type { AppEnv } from "../types";

function problemResponse(c: Context<AppEnv>, error: unknown): Response {
  const problem = toProblem(error, { instance: c.req.path, requestId: c.get("requestId") });
  return c.json(problem, problem.status as 400, { "Content-Type": "application/problem+json" });
}

/** Todo error que escapa de una ruta acaba como problem+json (COM-003). */
export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (!(error instanceof AppError) || error.status >= 500) {
    // El detalle completo va al log; al cliente solo le llega el 500 genérico.
    c.get("logger")?.error({ err: error }, "unhandled error");
  }
  return problemResponse(c, error);
};

export const handleNotFound: NotFoundHandler<AppEnv> = (c) =>
  problemResponse(c, new AppError("not-found"));
