const numericVersionParts = (version: string): number[] => {
  const core = version.trim().replace(/^v/i, '').split(/[+-]/, 1)[0];
  const parts = core.split('.').map((part) => Number.parseInt(part, 10));
  return parts.every(Number.isFinite) ? parts : [0];
};

export const compareVersions = (left: string, right: string): number => {
  const leftParts = numericVersionParts(left);
  const rightParts = numericVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
};

export const newestVersion = (left: string, right: string): string =>
  compareVersions(left, right) >= 0 ? left : right;
