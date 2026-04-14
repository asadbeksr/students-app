export async function generateImageThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function readFileAsText(arrayBuffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType === 'application/pdf') return 'FileText';
  if (mimeType.includes('json')) return 'Code';
  if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'Code';
  if (mimeType.includes('python')) return 'Code';
  if (mimeType.includes('java')) return 'Code';
  if (mimeType.includes('html') || mimeType.includes('css')) return 'Code';
  return 'File';
}

export function getFileTypeCategory(mimeType: string): 'image' | 'document' | 'code' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || mimeType === 'text/plain' || mimeType === 'text/markdown') return 'document';
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('python') ||
    mimeType.includes('java') ||
    mimeType.includes('html') ||
    mimeType.includes('css') ||
    mimeType.includes('json') ||
    mimeType.includes('xml')
  ) return 'code';
  return 'other';
}
