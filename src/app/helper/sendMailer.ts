import nodemailer from "nodemailer";
import config from "../config";

export const sendMailer = async (
  email: string,
  subject?: string,
  text?: string,
  html?: string
) => {
  // Create a test account or replace with real credentials.
  const transporter = nodemailer.createTransport({
    host: config.sendMail.host,
    port: Number(config.sendMail.email_port),
    secure: false, // true for 465, false for other ports
    auth: {
      user: config.sendMail.email,
      pass: config.sendMail.password,
    },
  });

  // Wrap in an async IIFE so we can use await.

  const info = await transporter.sendMail({
    from: `"Padel leagues" ${config.sendMail.email_from}`,
    to: email,
    subject,
    text,
    html,
  });

  console.log("Message sent:", info.messageId);
};
