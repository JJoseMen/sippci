import { TipoTramite } from '@prisma/client';

const PREFIJOS: Record<string, string> = {
  CERTIFICACION_SIPPCI: 'SIPPCI',
  REGISTRO_PROFESIONAL: 'PROF',
  CAPACITACION: 'CAP',
  RENOVACION: 'REN',
};

export function generarCodigoFormulario(
  tipoTramite: TipoTramite,
  tipoPersona: string | undefined,
  secuencial: number,
): string {
  const prefijo = PREFIJOS[tipoTramite] ?? 'OTRO';
  const sub = tipoPersona === 'JURIDICA' ? 'JUR' : 'NAT';
  const anio = new Date().getFullYear();
  const seq = String(secuencial).padStart(5, '0');
  return `${prefijo}-${sub}-${anio}-${seq}`;
}

export function generarCodigoCertificado(secuencial: number): string {
  const anio = new Date().getFullYear();
  const seq = String(secuencial).padStart(5, '0');
  return `CERT-${anio}-${seq}`;
}

export function generarCodigoJurada(secuencial: number): string {
  const anio = new Date().getFullYear();
  const seq = String(secuencial).padStart(5, '0');
  return `DJ-${anio}-${seq}`;
}

export function generarCodigoSubparticipante(solicitudId: number, secuencial: number): string {
  const anio = new Date().getFullYear();
  return `CAP-${String(solicitudId).padStart(4, '0')}-${anio}-${String(secuencial).padStart(4, '0')}`;
}

export function generarCodigoCertificadoParticipante(secuencial: number): string {
  const anio = new Date().getFullYear();
  return `CER-CAP-${anio}-${String(secuencial).padStart(5, '0')}`;
}
