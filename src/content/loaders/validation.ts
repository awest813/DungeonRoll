export function expectObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  return value;
}

export function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

export function expectNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${path} must be a valid number`);
  }
  return value;
}

export function expectExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string
): void {
  const extraKeys = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extraKeys.length > 0) {
    throw new Error(`${path} contains unknown key(s): ${extraKeys.join(', ')}`);
  }
}

export function expectUniqueId<T extends { id: string }>(
  map: Map<string, T>,
  value: T,
  path: string
): void {
  if (map.has(value.id)) {
    throw new Error(`${path} contains duplicate id \"${value.id}\"`);
  }
}
