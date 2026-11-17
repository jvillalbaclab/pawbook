import { describe, expect, test } from "bun:test";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { messagesFor } from "@/i18n/messages";
import { RequestButton } from "./request-button";

/** Renderiza con el catálogo en español, como lo hace el layout raíz. */
function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="es" messages={messagesFor("es")}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("RequestButton", () => {
  test("ofrece solicitar e indica a quién llega la solicitud", () => {
    const html = render(<RequestButton status="available" organizationName="Patitas Canela" />);
    expect(html).toContain("Solicitar adopción");
    expect(html).toContain("La solicitud llega a Patitas Canela por chat y correo.");
  });

  test("un animal ya adoptado no muestra el botón", () => {
    const html = render(<RequestButton status="adopted" organizationName="Patitas Canela" />);
    expect(html).toContain("Ya fue adoptado.");
    expect(html).not.toContain("Solicitar adopción");
  });
});
