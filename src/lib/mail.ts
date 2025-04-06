import { createTransport, SentMessageInfo } from "nodemailer";
import { config } from "dotenv";

config();

const transporter = createTransport({
  host: "smtppro.zoho.com.au",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL_USERNAME as string,
    pass: process.env.ZOHO_EMAIL_APP_PASSWORD as string
  }
});

export async function sendEmail(options: {
  to: string;
  subject: string;
  contents: {
    plaintext: string;
    html: string;
  }
}): Promise<SentMessageInfo> {
  return await transporter.sendMail({
    from: `"VCT Tools" <${process.env.ZOHO_EMAIL_USERNAME}>`,
    to: options.to,
    subject: options.subject,
    text: options.contents.plaintext,
    html: options.contents.html
  });
}