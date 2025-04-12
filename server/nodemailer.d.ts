declare module 'nodemailer' {
  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    attachments?: any[];
    headers?: any;
  }

  export interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<any>;
    verify(callback: (error: any, success: boolean) => void): void;
  }

  export function createTransport(options: any): Transporter;
  export function getTestMessageUrl(info: any): string;
}