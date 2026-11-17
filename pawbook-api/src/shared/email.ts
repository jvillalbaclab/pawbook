/*
 * Puerto de correo transaccional. Los módulos componen el mensaje (asunto y texto en español)
 * y el adaptador lo entrega: en desarrollo a un directorio local, en tests a memoria y, cuando
 * haya cuenta, a un proveedor SMTP o HTTP. Ningún adaptador debe escribir el destinatario ni
 * el cuerpo en los logs: contienen datos personales y enlaces con tokens (NFR-OBS-002).
 */

export type EmailMessage = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  /** Identifica la plantilla (`identity.verify-email`) para métricas y logs sin datos personales. */
  readonly template: string;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
