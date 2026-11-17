import { describe, expect, test } from "bun:test";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { messagesFor } from "@/i18n/messages";
import { EmptyState, ErrorState, LoadingState, viewStateOf } from "./states";

/** Renderiza con el catálogo en español, como lo hace el layout raíz. */
function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="es" messages={messagesFor("es")}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("viewStateOf", () => {
  test("sin datos ni error, está cargando", () => {
    expect(viewStateOf({ isError: false, data: undefined })).toBe("loading");
  });

  test("sin datos y con error, muestra el error", () => {
    expect(viewStateOf({ isError: true, data: undefined })).toBe("error");
  });

  test("una lista vacía es el estado vacío", () => {
    expect(viewStateOf({ isError: false, data: [] })).toBe("empty");
  });

  test("con datos en caché, un refresco fallido no tapa el contenido", () => {
    expect(viewStateOf({ isError: true, data: [1, 2] })).toBe("ready");
  });

  test("acepta un criterio de vacío propio", () => {
    expect(viewStateOf({ isError: false, data: null }, (data) => data === null)).toBe("empty");
  });
});

describe("componentes de estado", () => {
  test("el error se anuncia y ofrece reintentar", () => {
    const html = render(
      <ErrorState icon={null} title="No pudimos cargar el feed" onRetry={() => {}} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("No pudimos cargar el feed");
    expect(html).toContain("Reintentar");
  });

  test("sin onRetry no pinta el botón", () => {
    const html = render(<ErrorState icon={null} title="Falló" />);
    expect(html).not.toContain("Reintentar");
  });

  test("sin descripción usa la genérica del catálogo", () => {
    const html = render(<ErrorState icon={null} title="Falló" />);
    expect(html).toContain("No es tu conexión");
  });

  test("el estado vacío no se anuncia como alerta", () => {
    const html = render(<EmptyState icon={null} title="Nada" description="Aún." />);
    expect(html).not.toContain('role="alert"');
  });

  test("la carga expone un texto accesible y oculta los esqueletos", () => {
    const html = render(
      <LoadingState label="Cargando publicaciones">
        <span>esqueleto</span>
      </LoadingState>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('<span class="sr-only">Cargando publicaciones</span>');
    expect(html).toContain('aria-hidden="true"');
  });
});
