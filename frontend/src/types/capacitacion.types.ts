export type NombreCurso = 'EXTINTORES' | 'PRIMEROS_AUXILIOS' | 'EVACUACION' | 'TRABAJOS_EN_ALTURA';

export type EstadoProgramacion =
  'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO' | 'REPROGRAMADO';

export type EstadoParticipante = 'INSCRITO' | 'APROBADO' | 'REPROBADO';

export interface Curso {
  id: number;
  nombre: NombreCurso;
  descripcion: string | null;
  modalidad: string;
  duracionHoras: number | null;
  costoBsf: string | null;
  activo: boolean;
  createdAt: string;
}

export interface Instructor {
  id: number;
  nombre: string;
  apellido: string;
  ci: string | null;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipanteCapacitacion {
  id: number;
  cursoId: number | null;
  solicitudId: number | null;
  nombre: string;
  ci: string;
  email: string | null;
  telefono: string | null;
  estado: EstadoParticipante;
  certificadoEmitido: boolean;
  createdAt: string;
}

export interface Programacion {
  id: number;
  cursoId: number;
  instructorId: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  lugar: string | null;
  cupo: number | null;
  estado: EstadoProgramacion;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  curso?: Curso | null;
  instructor?: Instructor | null;
  _count?: { participantes: number };
}

export interface InscripcionParticipante {
  id: number;
  programacionId: number;
  participanteId: number;
  puntaje: number | null;
  aprobado: boolean | null;
  certificadoId: number | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  participante?: ParticipanteCapacitacion | null;
}

// ------------------------------------------------------------
// DTOs — alineados con backend/src/modules/capacitaciones/dto
// ------------------------------------------------------------

export interface QueryProgramacionDto {
  search?: string;
  cursoId?: number;
  instructorId?: number;
  estado?: EstadoProgramacion;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export interface CrearProgramacionDto {
  cursoId: number;
  instructorId?: number;
  fechaInicio: string;
  fechaFin?: string;
  lugar?: string;
  cupo?: number;
  observaciones?: string;
}

export type ActualizarProgramacionDto = Partial<CrearProgramacionDto>;

export interface ReprogramarProgramacionDto {
  fechaInicio: string;
  fechaFin?: string;
  observaciones?: string;
}

export interface QueryInstructorDto {
  search?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export interface CrearInstructorDto {
  nombre: string;
  apellido: string;
  ci: string;
  email?: string;
  telefono?: string;
  especialidad?: string;
}

export type ActualizarInstructorDto = Partial<CrearInstructorDto>;

export interface QueryParticipanteProgramacionDto {
  search?: string;
  estado?: EstadoParticipante;
  aprobado?: boolean;
  page?: number;
  limit?: number;
}

export interface InscribirParticipanteDto {
  participanteId: number;
}

export interface ActualizarEstadoParticipanteDto {
  estado?: EstadoParticipante;
  aprobado?: boolean;
  puntaje?: number;
  observaciones?: string;
  justificacion?: string;
}

export interface QueryParticipanteCatalogoDto {
  search?: string;
  estado?: EstadoParticipante;
  page?: number;
  limit?: number;
}

export interface CrearParticipanteCatalogoDto {
  nombre: string;
  ci: string;
  email?: string;
  telefono?: string;
}

// ------------------------------------------------------------
// Certificados de capacitación (FASE 3.4.B)
// ------------------------------------------------------------

export type EstadoCertificadoCapacitacion = 'EMITIDO' | 'VENCIDO' | 'REVOCADO';

export type EstadoVigencia = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';

export interface CertificadoCapacitacion {
  id: number;
  codigo: string;
  participanteId: number;
  programacionId: number;
  cursoId: number;
  instructorId: number | null;
  emitidoEn: string;
  vigenciaHasta: string;
  rutaPdf: string | null;
  qrUrl: string | null;
  emitidoPorId: number | null;
  estado: EstadoCertificadoCapacitacion;
  curso?: Curso | null;
  instructor?: Instructor | null;
  participante?: ParticipanteCapacitacion | null;
  programacion?: Programacion | null;
  estadoVigencia?: EstadoVigencia;
}

export interface ResultadoLoteCertificado {
  emitidos: number;
  codigos: string[];
  errores: { participanteId: number; mensaje: string }[];
}

export interface CertificadoCapacitacionValidacion {
  valido: boolean;
  vencido?: boolean;
  codigo?: string;
  participante?: { nombre: string; ci: string } | null;
  curso?: { nombre: string; duracionHoras: number | null; modalidad: string } | null;
  programacion?: { fechaInicio: string; lugar: string | null } | null;
  instructor?: { nombre: string; apellido: string } | null;
  fechaEmision?: string;
  fechaVigencia?: string;
  estado?: EstadoCertificadoCapacitacion;
  mensaje: string;
}

export interface QueryCertificadoCapacitacionDto {
  search?: string;
  programacionId?: number;
  cursoId?: number;
  estado?: EstadoCertificadoCapacitacion;
  page?: number;
  limit?: number;
}

export interface EmitirCertificadoCapacitacionDto {
  programacionId: number;
  participanteId: number;
  observaciones?: string;
}

export interface EmitirLoteCertificadoDto {
  programacionId: number;
}

// ------------------------------------------------------------
// Tipos legacy del flujo de solicitudes (wizard ciudadano)
// ------------------------------------------------------------

export interface AgregarParticipanteDto {
  nombreCompleto: string;
  carnet: string;
  expedido: string;
  email?: string;
  telefono?: string;
  cursos: string[];
}

export interface CostoTotalResponse {
  totalParticipantes: number;
  costoUnitario: number;
  costoTotal: number;
}
