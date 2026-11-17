import { beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { messagesFor } from "@/i18n/messages";
import { useAuthStore } from "@/stores/auth";

// Fuera del App Router no hay router: se sustituye por uno vacío.
mock.module("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

const { FormAlert, TextField } = await import("./form-fields");
const { SessionGate } = await import("./session-gate");
const { RegistrationForm } = await import("./registration-form");

function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="es" messages={messagesFor("es")} timeZone="UTC">
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("campos de los formularios de acceso", () => {
  test("un error local sale del catálogo y queda enlazado al campo", () => {
    const html = render(
      <TextField name="password" label="Contraseña" error={{ code: "password-too-short" }} />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="password-error"');
    expect(html).toContain("La contraseña necesita al menos 10 caracteres.");
  });

  test("un error de campo de la API muestra su texto", () => {
    const html = render(
      <TextField name="birthDate" label="Fecha" error={{ message: "Edad mínima: 18 años" }} />,
    );
    expect(html).toContain("Edad mínima: 18 años");
  });

  test("el mensaje general se anuncia como alerta, con la espera del 429", () => {
    const html = render(
      <FormAlert message={{ key: "problems.rateLimitedWait", values: { seconds: 30 } }} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Vuelve a probar en 30 segundos.");
  });
});

// En servidor, zustand siempre da el estado inicial ("unknown"): igual que en el prerenderizado.
// Las decisiones con sesión y sin ella se prueban en auth.test.ts (decideAccess).
describe("SessionGate", () => {
  beforeEach(() => useAuthStore.setState({ status: "unknown", user: null }));

  test("mientras se comprueba la sesión no muestra el contenido protegido", () => {
    const html = render(<SessionGate>secreto</SessionGate>);
    expect(html).not.toContain("secreto");
    expect(html).toContain("Comprobando tu sesión");
  });
});

describe("formulario de registro", () => {
  test("pide fecha de nacimiento y muestra la edad mínima y la longitud del contrato", () => {
    const html = render(<RegistrationForm />);
    expect(html).toContain('name="birthDate"');
    expect(html).toContain('type="date"');
    expect(html).toContain("Mínimo 10 caracteres");
    expect(html).toContain("Confirmo que tengo 18 años o más");
  });

  test("sin client ID de Google, el botón aparece desactivado con aviso", () => {
    const html = render(<RegistrationForm />);
    expect(html).toContain("disabled");
    expect(html).toContain("El acceso con Google no está disponible ahora mismo.");
  });
});
