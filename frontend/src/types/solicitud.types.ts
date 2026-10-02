import { EstadoSolicitud, TipoTramite } from './common.types';
import { Usuario } from './usuario.types';
import { Empresa } from './empresa.types';
import { Documento } from './documento.types';
import { Pago } from './pago.types';
import { Certificado } from './certificado.types';

export interface Solicitud {
  id: number;
  codigoFormulario: string;
  tipoTramite: TipoTramite;
  subtipoTramite: string;
  estado: EstadoSolicitud;
  datosJson: Record<string, unknown>;
  usuarioId: number;
  empresaId?: number;
  fechaVigencia?: string;
  fechaAprobacion?: string;
  esRenovacion?: boolean;
  solicitudAnteriorId?: number;
  createdAt: string;
  updatedAt: string;
  documentos?: Pick<Documento, 'id' | 'tipo' | 'nombreOriginal' | 'estado'>[];
  pagos?: Pick<Pago, 'id' | 'numeroOperacion' | 'monto' | 'estado'>[];
}

export interface SolicitudWithRelations extends Solicitud {
  usuario: Pick<Usuario, 'id' | 'nombre' | 'email'>;
  empresa?: Empresa;
  documentos?: Documento[];
  pagos?: Pago[];
  certificados?: Certificado[];
  historial?: HistorialSolicitud[];
  declaracionesJuradas?: import('./declaracion.types').DeclaracionJurada | null;
  participantesCapacitacion?: ParticipanteCapacitacion[];
}

export interface ParticipanteCapacitacion {
  id: number;
  subCodigo: string;
  nombreCompleto: string;
  carnet: string;
  expedido: string;
  email?: string | null;
  telefono?: string | null;
  esRepresentante: boolean;
  estado: string;
  observacion?: string | null;
  codigoCertificado?: string | null;
  instructor?: string | null;
  calificacion?: string | null;
  createdAt: string;
  relaciones: { curso: { id: number; nombre: string; costoBsf: number } }[];
}

export interface CreateSolicitudDto {
  tipoTramite: TipoTramite;
  subtipoTramite: string;
  empresaId?: number;
  datosJson: Record<string, unknown>;
}

export interface CambiarEstadoDto {
  estado: EstadoSolicitud;
  comentario?: string;
}

export interface HistorialSolicitud {
  id: number;
  estadoAnterior: string;
  estadoNuevo: string;
  comentario?: string;
  createdAt: string;
  realizadoPor?: { id: number; nombre: string };
}
