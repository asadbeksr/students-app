// Modified from polito/students-app — 2026-04-13

export const sortByNameAsc = <T extends { name: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
};

export const sortByNameDesc = <T extends { name: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) =>
    b.name.toLowerCase().localeCompare(a.name.toLowerCase()),
  );
};

export const sortByDateDesc = <T extends { createdAt: Date }>(items: T[]): T[] => {
  return [...items].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
};

export const sortByDateAsc = <T extends { createdAt: Date }>(items: T[]): T[] => {
  return [...items].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
};

export const sortByUpdatedDesc = <T extends { updatedAt: Date }>(items: T[]): T[] => {
  return [...items].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
};

export const sortByUpdatedAsc = <T extends { updatedAt: Date }>(items: T[]): T[] => {
  return [...items].sort(
    (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
  );
};

export const sortByBooleanDesc = <T>(
  items: T[],
  getBoolean: (item: T) => boolean,
): T[] => {
  return [...items].sort((a, b) => {
    const aValue = getBoolean(a);
    const bValue = getBoolean(b);
    if (aValue === bValue) return 0;
    return aValue ? -1 : 1;
  });
};

export const sortByBooleanAsc = <T>(
  items: T[],
  getBoolean: (item: T) => boolean,
): T[] => {
  return [...items].sort((a, b) => {
    const aValue = getBoolean(a);
    const bValue = getBoolean(b);
    if (aValue === bValue) return 0;
    return aValue ? 1 : -1;
  });
};

export const sortWithDirectoriesFirst = <T extends { type: string }>(
  items: T[],
  sortFunction: (a: T, b: T) => number,
): T[] => {
  return [...items].sort((a, b) => {
    if (a.type === 'directory' && b.type === 'directory') return 0;
    if (a.type === 'directory') return -1;
    if (b.type === 'directory') return 1;
    return sortFunction(a, b);
  });
};

export const sortWithDirectoriesFirstByName = <
  T extends { type: string; name: string },
>(items: T[]): T[] => {
  return sortWithDirectoriesFirst(items, (a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
};

export const sortWithDirectoriesFirstByDate = <T extends { type: string }>(
  items: T[],
  getCreatedAt: (item: T) => Date,
): T[] => {
  return sortWithDirectoriesFirst(items, (a, b) => {
    const dateA = getCreatedAt(a);
    const dateB = getCreatedAt(b);
    return dateB.getTime() - dateA.getTime();
  });
};
