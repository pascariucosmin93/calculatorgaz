import nodemailer from "nodemailer";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isMailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD &&
      process.env.MAIL_FROM?.trim()
  );

export const isValidEmail = (value: unknown): value is string =>
  typeof value === "string" && EMAIL_PATTERN.test(value.trim());

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    requireTLS: true,
    auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    socketTimeout: 15_000
  });

  await transport.sendMail({
    from: process.env.MAIL_FROM!.trim(),
    to: to.trim(),
    subject: "Resetare parolă CalculatorGaz",
    text: [
      "Am primit o cerere de resetare a parolei pentru contul tău CalculatorGaz.",
      "",
      `Deschide linkul de mai jos (valabil o oră): ${resetLink}`,
      "",
      "Dacă nu ai cerut tu resetarea, ignoră acest mesaj; parola ta rămâne neschimbată."
    ].join("\n")
  });
};
