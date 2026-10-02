import api from '@/lib/api';
import type { ConsultaSolicitudPublica } from '@/types/public.types';
import type { VerificarCertificadoResponse } from '@/types/certificado.types';
import type { CertificadoCapacitacionValidacion } from '@/types/capacitacion.types';

export interface CertificadoValidacion {
  valido: boolean;
  vencido?: boolean;
  codigo?: string;
  tipo?: string;
  titular?: string;
  nit?: string;
  fechaEmision?: string;
  fechaVigencia?: string;
  mensaje: string;
}

export const publicService = {
  async consultarEstado(codigo: string): Promise<ConsultaSolicitudPublica> {
    const res = await api.get(`/public/solicitudes/${codigo}/estado`);
    return res.data;
  },

  async verificarCertificado(codigo: string): Promise<VerificarCertificadoResponse> {
    const res = await api.get(`/public/certificados/verificar/${codigo}`);
    return res.data;
  },

  async validarCertificado(codigo: string): Promise<CertificadoValidacion> {
    const res = await api.get(`/public/validar-certificado/${codigo}`);
    return res.data;
  },

  async validarCertificadoCapacitacion(
    codigo: string,
  ): Promise<CertificadoCapacitacionValidacion> {
    const res = await api.get(`/public/validar-certificado-capacitacion/${codigo}`);
    return res.data;
  },
};
