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
  
  export interface TestAccount {
    user: string;
    pass: string;
    smtp: { host: string; port: number; secure: boolean };
    imap: { host: string; port: number; secure: boolean };
    pop3: { host: string; port: number; secure: boolean };
    web: string;
  }

  export function createTransport(options: any): Transporter;
  export function createTestAccount(): Promise<TestAccount>;
  export function getTestMessageUrl(info: any): string;
}