export type EstadoDocumento = 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO';

export interface Documento {
  id: number;
  solicitudId: number;
  usuarioId: number;
  tipo: string;
  rutaArchivo: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  estado: EstadoDocumento;
  observaciones?: string;
  createdAt: string;
}

export interface RevisarDocumentoDto {
  estado: EstadoDocumento;
  observaciones?: string;
  observacion?: string;
}
