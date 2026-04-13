export const FILE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  code: 5 * 1024 * 1024, // 5MB
  maxAttachments: 10,
};

export const ALLOWED_TYPES = {
  image: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'text/markdown', 'application/json'],
  code: [
    'text/javascript',
    'text/typescript',
    'text/x-python',
    'text/x-java',
    'text/x-c++src',
    'text/x-csrc',
    'text/html',
    'text/css',
    'application/xml',
  ],
};

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check total allowed types
  const allAllowedTypes = [
    ...ALLOWED_TYPES.image,
    ...ALLOWED_TYPES.document,
    ...ALLOWED_TYPES.code,
  ];

  if (!allAllowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not supported` };
  }

  // Check size limits
  let limit = FILE_LIMITS.code;
  if (ALLOWED_TYPES.image.includes(file.type)) limit = FILE_LIMITS.image;
  if (ALLOWED_TYPES.document.includes(file.type)) limit = FILE_LIMITS.document;

  if (file.size > limit) {
    return { valid: false, error: `File too large. Max: ${formatBytes(limit)}` };
  }

  return { valid: true };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getAcceptedFileTypes(): string {
  return [
    ...ALLOWED_TYPES.image,
    ...ALLOWED_TYPES.document,
    ...ALLOWED_TYPES.code,
  ].join(',');
}
