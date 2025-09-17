import nodemailer from "nodemailer";
import config from "../config";

type MailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export const sendMailer = async ({ to, subject, text, html }: MailOptions) => {
  const transporter = nodemailer.createTransport({
    host: config.sendMail.host,
    port: Number(config.sendMail.email_port),
    secure: Number(config.sendMail.email_port) === 465, // true for 465 (SSL), false otherwise
    auth: {
      user: config.sendMail.email,
      pass: config.sendMail.password,
    },
  });

  const info = await transporter.sendMail({
    from: `"Padel Leagues" <${config.sendMail.email_from}>`,
    to,
    subject,
    text,
    html,
  });

  console.log("✅ Message sent:", info.messageId);
};
