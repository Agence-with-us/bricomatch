import { decode } from 'base64-arraybuffer';

export function createBlobFromBase64(base64Data: string): Blob {
  const byteArray = decode(base64Data);
  return new Blob([byteArray], { type: 'image/jpeg' });
}
