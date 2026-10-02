import api from '@/lib/api';
import type {
  Curso,
  ParticipanteCapacitacion,
  AgregarParticipanteDto,
} from '@/types/capacitacion.types';

export interface CursoBackend {
  id: number;
  nombre: string;
  costoBsf: number;
  activo: boolean;
}

export interface Participante {
  id: number;
  subCodigo: string;
  nombreCompleto: string;
  carnet: string;
  expedido: string;
  email: string | null;
  telefono: string | null;
  esRepresentante: boolean;
  estado: string;
  observacion: string | null;
  pdfFormularioRuta: string | null;
  codigoCertificado: string | null;
  instructor: string | null;
  calificacion: string | null;
  relaciones: { curso: { nombre: string; costoBsf: number } }[];
}

export const capacitacionesService = {
  async listarCursos(): Promise<Curso[]> {
    const res = await api.get('/cursos');
    return res.data;
  },

  async agregarParticipante(
    codigo: string,
    data: AgregarParticipanteDto,
  ): Promise<ParticipanteCapacitacion> {
    const res = await api.post(`/solicitudes/${codigo}/participantes`, data);
    return res.data;
  },

  async listarParticipantes(
    codigo: string,
  ): Promise<{ items: Participante[]; total: number; page: number; limit: number; pages: number }> {
    const res = await api.get(`/solicitudes/${codigo}/participantes`);
    return res.data;
  },

  async descargarPlantilla(codigo: string): Promise<Blob> {
    const res = await api.get(`/solicitudes/${codigo}/plantilla-excel`, {
      responseType: 'blob',
    });
    return res.data;
  },

  async subirLista(
    codigo: string,
    file: File,
  ): Promise<{ creados: number; participantes: Participante[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/solicitudes/${codigo}/lista-excel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async agregarRepresentante(codigo: string, esRepresentante: boolean) {
    const res = await api.post(`/solicitudes/${codigo}/agregar-representante`, {
      esRepresentante,
    });
    return res.data;
  },

  async agregarSolicitante(codigo: string) {
    const res = await api.post(`/solicitudes/${codigo}/agregar-solicitante`);
    return res.data;
  },

  async costoTotal(codigo: string) {
    const res = await api.get(`/solicitudes/${codigo}/costo-total`);
    return res.data as { total: number; participantes: number };
  },

  async eliminarParticipante(id: number) {
    const res = await api.delete(`/participantes/${id}`);
    return res.data;
  },

  async descargarFormulario(subCodigo: string): Promise<Blob> {
    const res = await api.get(`/participantes/${subCodigo}/formulario-pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },

  async descargarCertificado(subCodigo: string): Promise<Blob> {
    const res = await api.get(`/participantes/${subCodigo}/certificado`, {
      responseType: 'blob',
    });
    return res.data;
  },

  async aprobar(subCodigo: string, instructor?: string, calificacion?: string) {
    const res = await api.post(`/participantes/${subCodigo}/aprobar`, {
      instructor,
      calificacion,
    });
    return res.data;
  },

  async rechazar(subCodigo: string, observacion?: string) {
    const res = await api.post(`/participantes/${subCodigo}/rechazar`, { observacion });
    return res.data;
  },

  async reprobar(
    subCodigo: string,
    observacion?: string,
    instructor?: string,
    calificacion?: string,
  ) {
    const res = await api.post(`/participantes/${subCodigo}/reprobar`, {
      observacion,
      instructor,
      calificacion,
    });
    return res.data;
  },

  async aprobarTodos(codigo: string) {
    const res = await api.post(`/solicitudes/${codigo}/aprobar-todos`);
    return res.data;
  },

  async emitirCertificados(codigo: string) {
    const res = await api.post(`/solicitudes/${codigo}/emitir-certificados`);
    return res.data;
  },
};
