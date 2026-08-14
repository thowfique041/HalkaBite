export const uniqueById = <T extends { _id: string }>(items: readonly T[]): T[] =>
  Array.from(new Map(items.map(item => [item._id, item])).values());
