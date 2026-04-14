// Modified from polito/students-app — 2026-04-13
export const formatFileSize = (sizeInKiloBytes: number, fractionDigit: number = 2) => {
  if (sizeInKiloBytes < 1000) return `${sizeInKiloBytes.toFixed(fractionDigit)} KB`;
  if (sizeInKiloBytes < 1000000) return `${Math.round(sizeInKiloBytes / 1000)} MB`;
  return `${Math.round(sizeInKiloBytes / 1000000)} GB`;
};

export const splitNameAndExtension = (filePath?: string) => {
  const [, name, fileExtension] = filePath?.match(/(.+)\.(.+)$/) ?? [];
  return [name, fileExtension] as [string | null, string | null];
};

export const stripIdInParentheses = (name: string): string => {
  const lastDot = name.lastIndexOf('.');
  let result: string;
  if (lastDot > 0) {
    const beforeExt = name.slice(0, lastDot).replace(/\s*\(\d+\)\s*$/, '').trim();
    const ext = name.slice(lastDot);
    result = beforeExt ? beforeExt + ext : name;
  } else {
    result = name.replace(/\s*\(\d+\)\s*$/, '').trim();
  }
  return result.replace(/:/g, '_');
};
