import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common.types';
import type {
  CertificadoCapacitacion,
  EmitirCertificadoCapacitacionDto,
  EmitirLoteCertificadoDto,
  QueryCertificadoCapacitacionDto,
  ResultadoLoteCertificado,
} from '@/types/capacitacion.types';

const BASE = '/admin/sippci/capacitaciones/certificados';

type Params = Record<string, string | number | boolean | undefined>;

function limpiar(params: Params): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) out[k] = v as string | number | boolean;
  }
  return out;
}

export const certificadosCapacitacionService = {
  async listar(
    params: QueryCertificadoCapacitacionDto = {},
  ): Promise<PaginatedResponse<CertificadoCapacitacion>> {
    const res = await api.get(BASE, { params: limpiar(params as Params) });
    return res.data;
  },

  async emitir(data: EmitirCertificadoCapacitacionDto): Promise<CertificadoCapacitacion> {
    const res = await api.post(`${BASE}/emitir`, data);
    return res.data;
  },

  async emitirLote(data: EmitirLoteCertificadoDto): Promise<ResultadoLoteCertificado> {
    const res = await api.post(`${BASE}/emitir-lote`, data);
    return res.data;
  },

  async descargar(codigo: string): Promise<Blob> {
    const res = await api.get(`${BASE}/${codigo}/descargar`, { responseType: 'blob' });
    return res.data;
  },
};
