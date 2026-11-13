import { describe, expect, test } from "bun:test";
import { loadConfig } from "./config";

const base = {
  DATABASE_URL: "postgres://pawbook:secreto@localhost:5435/pawbook",
  VALKEY_URL: "redis://localhost:6380",
};

describe("loadConfig", () => {
  test("aplica valores por defecto y separa los orígenes CORS", () => {
    const config = loadConfig({ ...base, CORS_ORIGINS: "http://a.test, http://b.test,," });
    expect(config.PORT).toBe(3001);
    expect(config.NODE_ENV).toBe("development");
    expect(config.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
  });

  test("falla nombrando la variable sin revelar su valor", () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: "secreto-no-url" })).toThrow(/DATABASE_URL/);
    try {
      loadConfig({ ...base, DATABASE_URL: "secreto-no-url" });
    } catch (error) {
      expect(String(error)).not.toContain("secreto-no-url");
    }
  });

  test("rechaza un puerto fuera de rango", () => {
    expect(() => loadConfig({ ...base, PORT: "70000" })).toThrow(/PORT/);
  });
});
