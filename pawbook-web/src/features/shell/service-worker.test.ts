import { beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clearPrivatePageCaches } from "./service-worker";

/*
 * Ejecuta public/sw.js con un entorno de service worker simulado (self, caches, fetch)
 * para comprobar qué guarda al instalarse y cómo responde a cada petición.
 */

const SOURCE = readFileSync(join(import.meta.dir, "../../../public/sw.js"), "utf8");
const ORIGIN = "https://pawbook.test";

type Listener = (event: FakeEvent) => void;
type FakeEvent = {
  request?: Request;
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

function createEnvironment(network: (request: Request) => Promise<Response>) {
  const stores = new Map<string, Map<string, Response>>();
  const listeners = new Map<string, Listener>();
  const keyOf = (input: Request | string) =>
    new URL(typeof input === "string" ? input : input.url, ORIGIN).href;
  const doFetch = (input: Request | string) =>
    network(typeof input === "string" ? new Request(new URL(input, ORIGIN)) : input);

  const caches = {
    async open(name: string) {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      return {
        async addAll(urls: string[]) {
          for (const url of urls) store.set(keyOf(url), await doFetch(url));
        },
        async put(request: Request, response: Response) {
          store.set(keyOf(request), response);
        },
        async match(request: Request | string) {
          return store.get(keyOf(request))?.clone();
        },
        async delete(request: Request | string) {
          return store.delete(keyOf(request));
        },
        async keys() {
          return [...store.keys()].map((url) => new Request(url));
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };

  const self = {
    location: { origin: ORIGIN },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
  };

  new Function("self", "caches", "fetch", SOURCE)(self, caches, doFetch);

  async function dispatch(type: string, request?: Request) {
    let response: Promise<Response> | undefined;
    let pending: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({
      request,
      respondWith: (value) => {
        response = value;
      },
      waitUntil: (value) => {
        pending = value;
      },
    });
    await pending;
    return response ? await response : undefined;
  }

  return { stores, dispatch };
}

const OFFLINE_HTML =
  '<html><head><link rel="stylesheet" href="/_next/static/css/app.css"></head><body>Sin conexión' +
  '<script>self.__next_f.push([1,"[\\"/_next/static/chunks/app.js\\"]"])</script></body></html>';

function onlineNetwork(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/offline") return Promise.resolve(new Response(OFFLINE_HTML));
  return Promise.resolve(new Response(`contenido de ${pathname}`));
}

const offlineNetwork = () => Promise.reject(new TypeError("Failed to fetch"));

const navigation = (path: string) => {
  const request = new Request(new URL(path, ORIGIN));
  Object.defineProperty(request, "mode", { value: "navigate" });
  return request;
};

describe("service worker", () => {
  let network: (request: Request) => Promise<Response>;
  let env: ReturnType<typeof createEnvironment>;

  beforeEach(async () => {
    network = onlineNetwork;
    env = createEnvironment((request) => network(request));
    await env.dispatch("install");
  });

  test("al instalarse guarda la carcasa y los estáticos de la página sin conexión", () => {
    const keys = [...(env.stores.get("pawbook-shell-v2")?.keys() ?? [])];
    expect(keys).toContain(`${ORIGIN}/offline`);
    expect(keys).toContain(`${ORIGIN}/manifest.webmanifest`);
    expect(keys).toContain(`${ORIGIN}/icon/512`);
    expect(keys).toContain(`${ORIGIN}/_next/static/css/app.css`);
    // Rutas escapadas dentro del payload RSC: sin la barra invertida final.
    expect(keys).toContain(`${ORIGIN}/_next/static/chunks/app.js`);
    expect(keys.some((key) => key.endsWith("/"))).toBe(false);
  });

  test("sin red, una página nunca visitada muestra la página sin conexión", async () => {
    network = offlineNetwork;
    const response = await env.dispatch("fetch", navigation("/pawmates"));
    expect(await response?.text()).toContain("Sin conexión");
  });

  test("sin red, una página ya visitada se sirve desde la caché", async () => {
    await env.dispatch("fetch", navigation("/adopcion"));
    network = offlineNetwork;
    const response = await env.dispatch("fetch", navigation("/adopcion"));
    expect(await response?.text()).toBe("contenido de /adopcion");
  });

  test("los estáticos con hash se sirven desde la caché sin ir a la red", async () => {
    network = offlineNetwork;
    const response = await env.dispatch("fetch", new Request(`${ORIGIN}/_next/static/css/app.css`));
    expect(await response?.text()).toBe("contenido de /_next/static/css/app.css");
  });

  test("no intercepta la API, otros orígenes ni peticiones que no son GET", async () => {
    expect(await env.dispatch("fetch", new Request(`${ORIGIN}/v1/feed`))).toBeUndefined();
    expect(
      await env.dispatch("fetch", new Request("https://cdn.example.com/a.js")),
    ).toBeUndefined();
    expect(
      await env.dispatch("fetch", new Request(`${ORIGIN}/`, { method: "POST" })),
    ).toBeUndefined();
  });

  test("al activarse borra las cachés de versiones anteriores", async () => {
    env.stores.set("pawbook-shell-v1", new Map());
    env.stores.set("pawbook-pages-v2", new Map());
    env.stores.set("otra-app", new Map());
    await env.dispatch("activate");
    expect([...env.stores.keys()].sort()).toEqual([
      "otra-app",
      "pawbook-pages-v2",
      "pawbook-shell-v2",
    ]);
  });

  test("las páginas visitadas van a su propia caché, no a la de la carcasa", async () => {
    await env.dispatch("fetch", navigation("/mensajes"));
    expect(env.stores.get("pawbook-pages-v2")?.has(`${ORIGIN}/mensajes`)).toBe(true);
    expect(env.stores.get("pawbook-shell-v2")?.has(`${ORIGIN}/mensajes`)).toBe(false);
  });

  test("guarda como mucho 30 páginas y descarta las más antiguas", async () => {
    for (let index = 0; index < 32; index++) {
      await env.dispatch("fetch", navigation(`/mascota/m${index}`));
    }
    // Volver a visitar una página la pasa a la más reciente.
    await env.dispatch("fetch", navigation("/mascota/m2"));
    await env.dispatch("fetch", navigation("/mascota/m32"));
    const pages = [...(env.stores.get("pawbook-pages-v2")?.keys() ?? [])];
    expect(pages).toHaveLength(30);
    expect(pages).not.toContain(`${ORIGIN}/mascota/m0`);
    expect(pages).not.toContain(`${ORIGIN}/mascota/m3`);
    expect(pages).toContain(`${ORIGIN}/mascota/m2`);
  });
});

describe("clearPrivatePageCaches", () => {
  test("al cerrar sesión borra las páginas visitadas y conserva la carcasa", async () => {
    const names = new Set(["pawbook-shell-v2", "pawbook-pages-v2", "pawbook-pages-v1", "otra-app"]);
    await clearPrivatePageCaches({
      keys: async () => [...names],
      delete: async (name: string) => names.delete(name),
    });
    expect([...names].sort()).toEqual(["otra-app", "pawbook-shell-v2"]);
  });

  test("sin Cache API no hace nada", async () => {
    await expect(clearPrivatePageCaches(undefined)).resolves.toBeUndefined();
  });
});
