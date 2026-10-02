import type { EstadoProgramacion } from '@/types/capacitacion.types';

export const ESTADOS_PROGRAMACION: EstadoProgramacion[] = [
  'PROGRAMADO',
  'REPROGRAMADO',
  'EN_CURSO',
  'FINALIZADO',
  'CANCELADO',
];

export const ETIQUETA_ESTADO: Record<EstadoProgramacion, string> = {
  PROGRAMADO: 'Programado',
  REPROGRAMADO: 'Reprogramado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export type VarianteBadge = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const VARIANTE_ESTADO: Record<EstadoProgramacion, VarianteBadge> = {
  PROGRAMADO: 'info',
  REPROGRAMADO: 'warning',
  EN_CURSO: 'warning',
  FINALIZADO: 'success',
  CANCELADO: 'danger',
};

export const VARIANTE_PARTICIPANTE: Record<string, VarianteBadge> = {
  INSCRITO: 'info',
  APROBADO: 'success',
  REPROBADO: 'danger',
};

// Transiciones permitidas (espejo de TRANSICIONES en programaciones.service.ts)
export function puedeEditar(estado: EstadoProgramacion): boolean {
  return estado !== 'FINALIZADO' && estado !== 'CANCELADO';
}

export function puedeReprogramar(estado: EstadoProgramacion): boolean {
  return estado === 'PROGRAMADO';
}

export function puedeIniciar(estado: EstadoProgramacion): boolean {
  return estado === 'PROGRAMADO';
}

export function puedeFinalizar(estado: EstadoProgramacion): boolean {
  return estado === 'EN_CURSO';
}

export function puedeCancelar(estado: EstadoProgramacion): boolean {
  return estado === 'PROGRAMADO' || estado === 'EN_CURSO' || estado === 'REPROGRAMADO';
}

export function puedeGestionarParticipantes(estado: EstadoProgramacion): boolean {
  return estado === 'PROGRAMADO' || estado === 'REPROGRAMADO';
}

// Espejo de ESTADOS_APTOS_RESULTADO en programaciones.service.ts
export function puedeResolverResultados(estado: EstadoProgramacion): boolean {
  return estado === 'EN_CURSO' || estado === 'FINALIZADO';
}

export function formatoCupo(inscritos: number, cupo: number | null): string {
  return cupo === null ? `${inscritos} / sin límite` : `${inscritos} / ${cupo}`;
}
