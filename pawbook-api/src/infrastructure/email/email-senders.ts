import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EmailMessage, EmailSender } from "../../shared/email";
import { uuidv7 } from "../../shared/ids";

/*
 * Adaptadores de correo sin proveedor real. Ninguno escribe en los logs el destinatario, el
 * asunto ni el cuerpo (NFR-OBS-002): los enlaces llevan tokens de un solo uso.
 * El adaptador SMTP o HTTP del proveedor transaccional queda pendiente de tener cuenta.
 */

/** Tests: guarda los mensajes en memoria para inspeccionarlos. */
export class MemoryEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }

  /** Último mensaje enviado a `to` (opcionalmente de una plantilla concreta). */
  lastTo(to: string, template?: string): EmailMessage | undefined {
    return this.sent.findLast(
      (message) => message.to === to && (template === undefined || message.template === template),
    );
  }
}

/**
 * Desarrollo: escribe cada mensaje como un `.txt` en un directorio local ignorado por git
 * (`.local/mail` por defecto) para abrir los enlaces de verificación sin servidor SMTP.
 */
export class FileEmailSender implements EmailSender {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  async send(message: EmailMessage): Promise<void> {
    await mkdir(this.#directory, { recursive: true });
    const name = `${uuidv7()}-${message.template}.txt`;
    const content = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      `X-Template: ${message.template}`,
      "",
      message.text,
      "",
    ].join("\n");
    await writeFile(join(this.#directory, name), content, { encoding: "utf8", mode: 0o600 });
  }
}
