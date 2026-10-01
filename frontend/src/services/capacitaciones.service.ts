import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common.types';
import type {
  Curso,
  ParticipanteCapacitacion,
  AgregarParticipanteDto,
  CostoTotalResponse,
} from '@/types/capacitacion.types';

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

  async listarParticipantes(codigo: string): Promise<PaginatedResponse<ParticipanteCapacitacion>> {
    const res = await api.get(`/solicitudes/${codigo}/participantes`);
    return res.data;
  },

  async subirLista(codigo: string, file: File): Promise<{ importados: number; errores: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/solicitudes/${codigo}/lista-excel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async eliminarParticipante(participanteId: number): Promise<void> {
    await api.delete(`/participantes/${participanteId}`);
  },

  async calcularCostoTotal(codigo: string): Promise<CostoTotalResponse> {
    const res = await api.get(`/solicitudes/${codigo}/costo-total`);
    return res.data;
  },
};
