import { isAxiosError } from 'axios';
import type { ApiError } from '@/types/common.types';

export function mensajeError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(' · ') : data.message;
    }
    if (!err.response) return 'Sin respuesta del servidor';
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
