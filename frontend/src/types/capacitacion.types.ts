export type NombreCurso = 'EXTINTORES' | 'PRIMEROS_AUXILIOS' | 'EVACUACION' | 'TRABAJOS_EN_ALTURA';

export type EstadoProgramacion =
  'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO' | 'REPROGRAMADO';

export type EstadoParticipante = 'INSCRITO' | 'APROBADO' | 'REPROBADO' | 'ABANDONO';

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
  asistencia: boolean | null;
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
  asistencia?: boolean;
  aprobado?: boolean;
  page?: number;
  limit?: number;
}

export interface InscribirParticipanteDto {
  participanteId: number;
}

export interface ActualizarEstadoParticipanteDto {
  estado?: EstadoParticipante;
  asistencia?: boolean;
  aprobado?: boolean;
  puntaje?: number;
  observaciones?: string;
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
