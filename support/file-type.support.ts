import { FileExtensions, FileType } from './enums';

export function getFileType(extension: string): FileType {
  if (videoExtensions.includes(extension as FileExtensions))
    return FileType.video;
  if (imageExtensions.includes(extension as FileExtensions))
    return FileType.image;
  if (audioExtensions.includes(extension as FileExtensions))
    return FileType.audio;
  //   if (pdfExtensions.includes(extension as FileExtensions)) return FileType.pdf;
  //   if (docxExtensions.includes(extension as FileExtensions))
  //     return FileType.docx;

  return FileType.other;
}

const videoExtensions = [
  FileExtensions.mp4,
  FileExtensions.mkv,
  FileExtensions.avi,
  FileExtensions.mov,
  FileExtensions.wmv,
  FileExtensions.flv,
];
const imageExtensions = [
  FileExtensions.jpg,
  FileExtensions.jpeg,
  FileExtensions.png,
  FileExtensions.gif,
  FileExtensions.bmp,
  FileExtensions.tiff,
  FileExtensions.svg,
  FileExtensions.webp,
  FileExtensions.jfif,
];
const audioExtensions = [
  FileExtensions.mp3,
  FileExtensions.wav,
  FileExtensions.aac,
  FileExtensions.flac,
  FileExtensions.ogg,
  FileExtensions.wma,
  FileExtensions.m4a,
];
const pdfExtensions = [FileExtensions.pdf];
const docxExtensions = [
  FileExtensions.docx,
  FileExtensions.doc,
  FileExtensions.dotx,
  FileExtensions.dot,
];

// Combine all extensions into a single regex pattern
const videoExtensionString = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv'];
const imageExtensionString = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tiff',
  'svg',
  'webp',
];
const audioExtensionString = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'wma', 'm4a'];
const pdfExtensionString = ['pdf'];
const docxExtensionString = ['docx', 'doc', 'dotx', 'dot'];

// Combine all extensions into a single regex pattern for FileTypeValidator
export const allExtensions = [
  ...videoExtensions,
  ...imageExtensions,
  ...audioExtensions,
  //   ...pdfExtensions,
  //   ...docxExtensions,
];

// Convert array to regex pattern
export function isValidExtension(extension: string): boolean {
  console.log('checking extension: ', extension);
  const pattern = new RegExp(`^(${allExtensions.join('|')})$`);
  return pattern.test(extension.toLowerCase());
}
