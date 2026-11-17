import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Higiene del catálogo: sin claves duplicadas (JSON.parse se quedaría en silencio con la
 * última) y sin claves que ningún componente use. La comprobación de uso es estática y
 * deliberadamente sencilla: el namespace debe aparecer en un useTranslations/getTranslations
 * y la clave relativa como literal ("clave") o como prefijo de una clave dinámica
 * (`prefijo.${variable}`). Las claves inexistentes ya las rechaza el typecheck.
 */

const SRC = join(import.meta.dir, "..");
const CATALOG_PATH = join(import.meta.dir, "messages", "es.json");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    const isSource = /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name);
    return isSource ? [path] : [];
  });
}

/** Claves repetidas dentro de un mismo objeto, con su ruta. Recorre el texto tal cual. */
function duplicateKeys(json: string): string[] {
  const duplicates: string[] = [];
  const stack: { keys: Set<string>; path: string }[] = [];
  let lastKey = "";
  let index = 0;
  while (index < json.length) {
    const char = json[index];
    if (char === '"') {
      let end = index + 1;
      while (json[end] !== '"') end += json[end] === "\\" ? 2 : 1;
      const value = JSON.parse(json.slice(index, end + 1)) as string;
      let next = end + 1;
      while (/\s/.test(json[next])) next++;
      if (json[next] === ":") {
        const scope = stack[stack.length - 1];
        if (scope.keys.has(value)) duplicates.push(scope.path ? `${scope.path}.${value}` : value);
        scope.keys.add(value);
        lastKey = value;
      }
      index = end + 1;
      continue;
    }
    if (char === "{") {
      const parent = stack[stack.length - 1];
      const path = parent ? (parent.path ? `${parent.path}.${lastKey}` : lastKey) : "";
      stack.push({ keys: new Set(), path });
    } else if (char === "}") {
      stack.pop();
    }
    index++;
  }
  return duplicates;
}

function leafKeys(node: unknown, path = ""): string[] {
  if (typeof node === "string") return [path];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeys(value, path ? `${path}.${key}` : key),
  );
}

function isUsed(fullKey: string, source: string): boolean {
  const segments = fullKey.split(".");
  // Prueba cada partición namespace / clave relativa ("a.b.c" → "a" + "b.c", "a.b" + "c").
  for (let split = 1; split < segments.length; split++) {
    const namespace = segments.slice(0, split).join(".");
    const relative = segments.slice(split);
    if (!new RegExp(`Translations\\(\\s*"${namespace}"\\s*\\)`).test(source)) continue;
    if (source.includes(`"${relative.join(".")}"`)) return true;
    for (let length = 1; length < relative.length; length++) {
      if (source.includes(`${relative.slice(0, length).join(".")}.\${`)) return true;
    }
  }
  return false;
}

describe("higiene del catálogo", () => {
  const raw = readFileSync(CATALOG_PATH, "utf8");

  test("detecta claves duplicadas en el mismo objeto", () => {
    expect(duplicateKeys('{"a": {"b": "1", "b": "2"}, "c": "3", "a": "4"}')).toEqual(["a.b", "a"]);
    expect(duplicateKeys('{"a": {"x": "1"}, "b": {"x": "2"}}')).toEqual([]);
  });

  test("el catálogo no tiene claves duplicadas", () => {
    expect(duplicateKeys(raw)).toEqual([]);
  });

  test("todas las claves del catálogo se usan en el código", () => {
    const source = sourceFiles(SRC)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const unused = leafKeys(JSON.parse(raw)).filter((key) => !isUsed(key, source));
    expect(unused).toEqual([]);
  });
});
