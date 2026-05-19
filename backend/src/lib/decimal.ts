export function toNumber(
  value: { toNumber: () => number } | number | null | undefined,
): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function serializeDecimal<T extends Record<string, unknown>>(
  obj: T,
  ...fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (val != null && typeof val === "object" && "toNumber" in (val as any)) {
      result[field] = (val as any).toNumber() as any;
    }
  }
  return result;
}

export function serializeDecimals<T extends Record<string, unknown>>(
  items: T[],
  ...fields: (keyof T)[]
): T[] {
  return items.map((item) => serializeDecimal(item, ...fields));
}
