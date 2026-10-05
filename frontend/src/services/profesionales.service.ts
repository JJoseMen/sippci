import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common.types';
import type { Profesional, CrearProfesionalDto } from '@/types/profesional.types';

export interface SolicitudProfesional {
  id: number;
  codigoFormulario: string;
  tipoTramite: string;
  subtipoTramite: 'NATURAL' | 'JURIDICA';
  estado: string;
  datosJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  usuario?: {
    id: number;
    nombre: string;
    email: string;
    telefono?: string;
  };
  empresa?: {
    id: number;
    razonSocial: string;
    nit: string;
  };
  documentos?: Array<{
    id: number;
    tipo?: string;
    nombreOriginal: string;
    estado: string;
    observaciones?: string;
  }>;
  certificados?: Array<{
    id: number;
    codigoCertificado: string;
    fechaVigencia: string;
  }>;
}

export interface CertificadoProfesional {
  id: number;
  codigoCertificado: string;
  tipo: string;
  fechaEmision: string;
  fechaVigencia: string;
  activo: boolean;
  estadoVigencia: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_VIGENCIA';
  solicitud: {
    id: number;
    codigoFormulario: string;
    subtipoTramite: string;
    usuario?: { id: number; nombre: string; email: string };
    empresa?: { id: number; razonSocial: string; nit: string };
  };
  emitidoPor?: { id: number; nombre: string };
}

export interface QueryProfesionalesParams {
  search?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export const profesionalesService = {
  // Legacy ciudadano — preservado FASE 0
  async crear(data: CrearProfesionalDto): Promise<Profesional> {
    const res = await api.post('/profesionales', data);
    return res.data;
  },

  async findAll(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Profesional>> {
    const res = await api.get('/profesionales', { params });
    return res.data;
  },

  async findOne(codigo: string): Promise<Profesional> {
    const res = await api.get(`/profesionales/${codigo}`);
    return res.data;
  },

  // Solicitudes Natural (admin)
  async listarNaturales(params?: QueryProfesionalesParams): Promise<PaginatedResponse<SolicitudProfesional>> {
    const res = await api.get('/admin/profesionales/solicitudes/natural', { params });
    return res.data;
  },
  async obtenerNatural(codigo: string): Promise<SolicitudProfesional> {
    const res = await api.get(`/admin/profesionales/solicitudes/natural/${codigo}`);
    return res.data;
  },

  // Solicitudes Jurídica (admin)
  async listarJuridicas(params?: QueryProfesionalesParams): Promise<PaginatedResponse<SolicitudProfesional>> {
    const res = await api.get('/admin/profesionales/solicitudes/juridica', { params });
    return res.data;
  },
  async obtenerJuridica(codigo: string): Promise<SolicitudProfesional> {
    const res = await api.get(`/admin/profesionales/solicitudes/juridica/${codigo}`);
    return res.data;
  },

  // Acciones
  async aprobar(codigo: string): Promise<void> {
    await api.post(`/admin/profesionales/solicitudes/${codigo}/aprobar`);
  },
  async finalizarRevision(codigo: string): Promise<{
    estado: string;
    todosValidados: boolean;
    total: number;
    validados: number;
    rechazados: number;
  }> {
    const res = await api.post(
      `/admin/profesionales/solicitudes/${codigo}/finalizar-revision-documentos`,
    );
    return res.data;
  },
  async observar(codigo: string, justificacion: string): Promise<void> {
    await api.post(`/admin/profesionales/solicitudes/${codigo}/observar`, { justificacion });
  },
  async rechazar(codigo: string, justificacion: string): Promise<void> {
    await api.post(`/admin/profesionales/solicitudes/${codigo}/rechazar`, { justificacion });
  },

  // Certificados
  async emitirCertificado(codigo: string, observaciones?: string) {
    const res = await api.post(`/admin/profesionales/solicitudes/${codigo}/emitir-certificado`, { observaciones });
    return res.data;
  },
  async listarCertificadosNaturales(params?: QueryProfesionalesParams): Promise<PaginatedResponse<CertificadoProfesional>> {
    const res = await api.get('/admin/profesionales/lista/naturales', { params });
    return res.data;
  },
  async listarCertificadosJuridicas(params?: QueryProfesionalesParams): Promise<PaginatedResponse<CertificadoProfesional>> {
    const res = await api.get('/admin/profesionales/lista/juridicas', { params });
    return res.data;
  },
  async listarCertificados(params?: QueryProfesionalesParams): Promise<PaginatedResponse<CertificadoProfesional>> {
    const res = await api.get('/admin/profesionales/certificados', { params });
    return res.data;
  },

  // Reportes
  async reporteEstados() {
    const res = await api.get('/admin/profesionales/reportes/solicitudes-por-estado');
    return res.data as Array<{ estado: string; total: number }>;
  },
  async reporteCertificadosPorMes() {
    const res = await api.get('/admin/profesionales/reportes/certificados-por-mes');
    return res.data as Array<{ mes: string; total: number }>;
  },
  async reportePorEspecialidad() {
    const res = await api.get('/admin/profesionales/reportes/por-especialidad');
    return res.data as Array<{ especialidad: string; total: number }>;
  },
};
