import { z } from "@hono/zod-openapi";

/** Error RFC 9457 (`application/problem+json`) que devuelve cualquier endpoint (COM-003). */
export const ProblemSchema = z
  .object({
    type: z.url().openapi({ example: "https://pawbook.app/problems/not-found" }),
    title: z.string().openapi({ example: "No encontramos lo que buscas" }),
    status: z.number().int().openapi({ example: 404 }),
    detail: z.string().optional(),
    instance: z.string().optional().openapi({ example: "/v1/pets/luna" }),
    requestId: z.string().optional(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .openapi("Problem");

export type Problem = z.infer<typeof ProblemSchema>;
