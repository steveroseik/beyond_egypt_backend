var QRCode = require('qrcode');

/**
 * Generates a base64 PNG image string for a QR code
 * @param data - The string content to encode in the QR
 * @returns Base64 string (data URL) of the QR code image
 */
export async function generateQRCodeBase64(data: string): Promise<string> {
  try {
    const base64Image = await QRCode.toBuffer(data, {
      type: 'image/png',
      errorCorrectionLevel: 'H', // highest level of error correction
      margin: 2,
      width: 200,
    });
    return base64Image; // data:image/png;base64,...
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    throw new Error('Could not generate QR code');
  }
}
