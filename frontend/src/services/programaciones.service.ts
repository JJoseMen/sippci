import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common.types';
import type {
  ActualizarEstadoParticipanteDto,
  ActualizarProgramacionDto,
  CrearParticipanteCatalogoDto,
  CrearProgramacionDto,
  InscripcionParticipante,
  InscribirParticipanteDto,
  ParticipanteCapacitacion,
  Programacion,
  QueryParticipanteCatalogoDto,
  QueryParticipanteProgramacionDto,
  QueryProgramacionDto,
  ReprogramarProgramacionDto,
} from '@/types/capacitacion.types';

const BASE = '/admin/sippci/capacitaciones/programaciones';
const CATALOGO = '/admin/sippci/capacitaciones/participantes';

type Params = Record<string, string | number | boolean | undefined>;

function limpiar(params: Params): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) out[k] = v as string | number | boolean;
  }
  return out;
}

export const programacionesService = {
  async listar(params: QueryProgramacionDto = {}): Promise<PaginatedResponse<Programacion>> {
    const res = await api.get(BASE, { params: limpiar(params as Params) });
    return res.data;
  },

  async obtener(id: number): Promise<Programacion> {
    const res = await api.get(`${BASE}/${id}`);
    return res.data;
  },

  async crear(data: CrearProgramacionDto): Promise<Programacion> {
    const res = await api.post(BASE, data);
    return res.data;
  },

  async actualizar(id: number, data: ActualizarProgramacionDto): Promise<Programacion> {
    const res = await api.put(`${BASE}/${id}`, data);
    return res.data;
  },

  async reprogramar(id: number, data: ReprogramarProgramacionDto): Promise<Programacion> {
    const res = await api.put(`${BASE}/${id}/reprogramar`, data);
    return res.data;
  },

  async cancelar(id: number): Promise<{ message: string; programacion: Programacion }> {
    const res = await api.put(`${BASE}/${id}/cancelar`);
    return res.data;
  },

  async iniciar(id: number): Promise<Programacion> {
    const res = await api.put(`${BASE}/${id}/iniciar`);
    return res.data;
  },

  async finalizar(id: number): Promise<Programacion> {
    const res = await api.put(`${BASE}/${id}/finalizar`);
    return res.data;
  },

  async listarParticipantes(
    id: number,
    params: QueryParticipanteProgramacionDto = {},
  ): Promise<PaginatedResponse<InscripcionParticipante>> {
    const res = await api.get(`${BASE}/${id}/participantes`, {
      params: limpiar(params as Params),
    });
    return res.data;
  },

  async inscribir(id: number, data: InscribirParticipanteDto): Promise<InscripcionParticipante> {
    const res = await api.post(`${BASE}/${id}/participantes`, data);
    return res.data;
  },

  async actualizarParticipante(
    id: number,
    participanteId: number,
    data: ActualizarEstadoParticipanteDto,
  ): Promise<InscripcionParticipante> {
    const res = await api.put(`${BASE}/${id}/participantes/${participanteId}/estado`, data);
    return res.data;
  },

  async desinscribir(
    id: number,
    participanteId: number,
  ): Promise<{ message: string; participanteId: number }> {
    const res = await api.delete(`${BASE}/${id}/participantes/${participanteId}`);
    return res.data;
  },
};

export const participantesCatalogoService = {
  async listar(
    params: QueryParticipanteCatalogoDto = {},
  ): Promise<PaginatedResponse<ParticipanteCapacitacion>> {
    const res = await api.get(CATALOGO, { params: limpiar(params as Params) });
    return res.data;
  },

  async crear(data: CrearParticipanteCatalogoDto): Promise<ParticipanteCapacitacion> {
    const res = await api.post(CATALOGO, data);
    return res.data;
  },
};
