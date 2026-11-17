# pawbook-web

Web de PawBook: Next.js 16 (App Router) + React 19, Tailwind CSS 4, Zustand y TanStack Query, gestionada con Bun.

## Puesta en marcha

```bash
bun install
bun run dev        # http://localhost:3000
```

## Verificaciones (gates)

| Comando             | Qué comprueba                                                                        |
| ------------------- | ------------------------------------------------------------------------------------ |
| `bun run lint`      | Biome: formato, reglas recomendadas e imports prohibidos                             |
| `bun run typecheck` | Genera los tipos de rutas (`next typegen`) y ejecuta `tsc --noEmit` en modo `strict` |
| `bun run test`      | Tests unitarios con `bun test`                                                       |
| `bun run build`     | Build de producción                                                                  |

## Datos de ejemplo (temporal)

Mientras no exista la API `/v1`, los datos salen de `src/lib/sample-data.ts`. Solo `src/lib/api.ts`
puede importarlo (lo impide una regla de Biome); conectar la API real es reescribir `api.ts` y borrar
`sample-data.ts` (T-M0.39).

## Organización

- `src/app/`: rutas, delgadas; componen funcionalidades.
- `src/features/`: código por funcionalidad (feed, chat, adopción, PawMates...).
- `src/design-system/`: tokens y componentes base.
- `src/lib/`: cliente de datos, tema, utilidades.
- `src/stores/`: estado de UI con Zustand.
