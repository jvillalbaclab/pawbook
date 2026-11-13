/*
 * Fronteras del monolito modular (arquitectura §4.2 y §7.1, NFR-MAINT-002).
 * Se verifican en CI con `bun run depcruise`; una violación rompe el build.
 */

// Adaptadores concretos que el núcleo de un módulo (domain/application) nunca debe conocer.
const INFRASTRUCTURE_PACKAGES =
  "(^|/)node_modules/(hono|@hono|drizzle-orm|postgres|ioredis|pino|@stream-io|@google/genai)/";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Los ciclos impiden extraer o testear un módulo por separado.",
      from: {},
      to: { circular: true },
    },
    {
      name: "core-sin-infraestructura",
      severity: "error",
      comment:
        "domain y application solo hablan con puertos: nada de Hono, Drizzle, Stream, Gemini ni clientes de BD.",
      from: { path: "^src/modules/[^/]+/(domain|application)/" },
      to: { path: INFRASTRUCTURE_PACKAGES },
    },
    {
      name: "domain-hacia-dentro",
      severity: "error",
      comment: "El dominio solo depende de sí mismo y del kernel compartido.",
      from: { path: "^src/modules/([^/]+)/domain/" },
      to: { path: "^src/", pathNot: ["^src/modules/$1/domain/", "^src/shared/"] },
    },
    {
      name: "application-hacia-dentro",
      severity: "error",
      comment: "Los casos de uso dependen del dominio y de sus puertos, no de adaptadores ni HTTP.",
      from: { path: "^src/modules/([^/]+)/application/" },
      to: {
        path: "^src/",
        // Otro módulo solo por su API pública (p. ej. social → pets, §4.2).
        pathNot: [
          "^src/modules/$1/(domain|application)/",
          "^src/modules/[^/]+/index[.]ts$",
          "^src/shared/",
        ],
      },
    },
    {
      name: "infrastructure-sin-http",
      severity: "error",
      comment: "Los adaptadores implementan puertos; no conocen las rutas.",
      from: { path: "^src/modules/([^/]+)/infrastructure/" },
      to: { path: "^src/modules/$1/http/" },
    },
    {
      name: "modulos-solo-por-index",
      severity: "error",
      comment: "Un módulo solo puede importar el index.ts público de otro módulo.",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/[^/]+/",
        pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/index[.]ts$"],
      },
    },
    {
      name: "shared-independiente",
      severity: "error",
      comment: "El kernel compartido no puede depender de módulos, HTTP ni composición.",
      from: { path: "^src/shared/" },
      to: { path: "^src/(modules|http|composition)/" },
    },
    {
      name: "composicion-solo-en-el-borde",
      severity: "error",
      comment: "Solo los entrypoints conocen el wiring concreto.",
      from: { path: "^src/", pathNot: ["^src/composition/", "^src/main[.][^/]+[.]ts$"] },
      to: { path: "^src/(composition/|main[.])" },
    },
    {
      name: "contracts-autonomo",
      severity: "error",
      comment: "@pawbook/contracts se publica solo: no puede importar código de la API.",
      from: { path: "^contracts/" },
      to: { path: "^src/" },
    },
    {
      name: "sin-dev-deps-en-produccion",
      severity: "error",
      comment: "El código que se despliega no puede usar dependencias de desarrollo.",
      from: { path: "^src/", pathNot: "[.]test[.]ts$" },
      to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
    },
    {
      name: "sin-imports-irresolubles",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "^dist/" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    builtInModules: { add: ["bun", "bun:test"] },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".js", ".json"],
    },
  },
};
