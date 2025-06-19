export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  cid: string;
}
