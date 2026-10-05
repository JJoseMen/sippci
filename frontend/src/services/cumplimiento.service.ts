import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common.types';

export interface SolicitudCumplimiento {
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
    apellido?: string;
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
    nombreOriginal: string;
    estado: string;
    tipo: string;
  }>;
  certificados?: Array<{
    id: number;
    codigoCertificado: string;
    fechaVigencia: string;
  }>;
  inspecciones?: Array<{
    id: number;
    estado: string;
    resultado?: string;
    fechaProgramada?: string;
    fechaRealizada?: string;
  }>;
}

export interface InspeccionCumplimiento {
  id: number;
  solicitudId: number;
  inspectorId: number;
  fechaProgramada?: string;
  fechaRealizada?: string;
  estado: string;
  resultado?: string;
  observaciones?: string;
  informeRuta?: string;
  solicitud?: {
    id: number;
    codigoFormulario: string;
    subtipoTramite: string;
    estado: string;
    usuario?: { nombre: string; apellido?: string };
    empresa?: { razonSocial: string };
  };
  inspector?: {
    id: number;
    nombre: string;
    apellido?: string;
  };
}

export interface CertificadoCumplimiento {
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
    datosJson?: Record<string, unknown>;
    usuario?: { id: number; nombre: string; apellido?: string };
    empresa?: { id: number; razonSocial: string; nit: string };
  };
  emitidoPor?: { id: number; nombre: string };
}

export interface QueryCumplimientoParams {
  search?: string;
  estado?: string;
  nivelRiesgo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export const cumplimientoService = {
  // Solicitudes Natural
  async listarNaturales(params?: QueryCumplimientoParams): Promise<PaginatedResponse<SolicitudCumplimiento>> {
    const res = await api.get('/admin/sippci/cumplimiento/solicitudes/natural', { params });
    return res.data;
  },
  async obtenerNatural(codigo: string): Promise<SolicitudCumplimiento> {
    const res = await api.get(`/admin/sippci/cumplimiento/solicitudes/natural/${codigo}`);
    return res.data;
  },

  // Solicitudes Jurídica
  async listarJuridicas(params?: QueryCumplimientoParams): Promise<PaginatedResponse<SolicitudCumplimiento>> {
    const res = await api.get('/admin/sippci/cumplimiento/solicitudes/juridica', { params });
    return res.data;
  },
  async obtenerJuridica(codigo: string): Promise<SolicitudCumplimiento> {
    const res = await api.get(`/admin/sippci/cumplimiento/solicitudes/juridica/${codigo}`);
    return res.data;
  },

  // Acciones
  async aprobar(codigo: string): Promise<void> {
    await api.post(`/admin/sippci/cumplimiento/solicitudes/${codigo}/aprobar`);
  },
  async finalizarRevision(codigo: string): Promise<{
    estado: string;
    todosValidados: boolean;
    total: number;
    validados: number;
    rechazados: number;
  }> {
    const res = await api.post(
      `/admin/sippci/cumplimiento/solicitudes/${codigo}/finalizar-revision-documentos`,
    );
    return res.data;
  },
  async observar(codigo: string, justificacion: string): Promise<void> {
    await api.post(`/admin/sippci/cumplimiento/solicitudes/${codigo}/observar`, { justificacion });
  },
  async rechazar(codigo: string, justificacion: string): Promise<void> {
    await api.post(`/admin/sippci/cumplimiento/solicitudes/${codigo}/rechazar`, { justificacion });
  },

  // Inspecciones
  async programarInspeccion(codigo: string, data: { fechaProgramada: string; inspectorId?: number; observaciones?: string }) {
    const res = await api.post(`/admin/sippci/cumplimiento/solicitudes/${codigo}/programar-inspeccion`, data);
    return res.data;
  },
  async listarInspecciones(params?: QueryCumplimientoParams): Promise<PaginatedResponse<InspeccionCumplimiento>> {
    const res = await api.get('/admin/sippci/cumplimiento/inspecciones', { params });
    return res.data;
  },
  async obtenerInspeccion(id: number): Promise<InspeccionCumplimiento> {
    const res = await api.get(`/admin/sippci/cumplimiento/inspecciones/${id}`);
    return res.data;
  },
  async registrarInforme(id: number, data: { resultado: string; observaciones: string; informeRuta?: string }) {
    const res = await api.post(`/admin/sippci/cumplimiento/inspecciones/${id}/registrar-informe`, data);
    return res.data;
  },

  // Certificados
  async emitirCertificado(codigo: string, observaciones?: string) {
    const res = await api.post(`/admin/sippci/cumplimiento/solicitudes/${codigo}/emitir-certificado`, { observaciones });
    return res.data;
  },
  async listarCertificados(params?: QueryCumplimientoParams): Promise<PaginatedResponse<CertificadoCumplimiento>> {
    const res = await api.get('/admin/sippci/cumplimiento/certificados', { params });
    return res.data;
  },

  // Reportes
  async reporteEstados() {
    const res = await api.get('/admin/sippci/cumplimiento/reportes/solicitudes-por-estado');
    return res.data as Array<{ estado: string; total: number }>;
  },
  async reporteNivelRiesgo() {
    const res = await api.get('/admin/sippci/cumplimiento/reportes/por-nivel-riesgo');
    return res.data as Array<{ nivel: string; total: number }>;
  },
  async reporteCertificadosPorMes() {
    const res = await api.get('/admin/sippci/cumplimiento/reportes/certificados-por-mes');
    return res.data as Array<{ mes: string; total: number }>;
  },
};
