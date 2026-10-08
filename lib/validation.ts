export class InvalidRequestError extends Error {}

export async function readJsonObject(request: {json(): Promise<unknown>}) {
  let value: unknown;
  try { value = await request.json(); }
  catch { throw new InvalidRequestError('بيانات الطلب ليست JSON صالحًا'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidRequestError('بيانات الطلب يجب أن تكون كائنًا');
  }
  return value as Record<string, unknown>;
}

export const validTime = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export const validText = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
