import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common.types';
import type { Documento, RevisarDocumentoDto } from '@/types/documento.types';

export const documentosService = {
  async subir(codigo: string, file: File, tipoDocumento: string): Promise<Documento> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipoDocumento', tipoDocumento);
    const res = await api.post(`/solicitudes/${codigo}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async listar(codigo: string): Promise<PaginatedResponse<Documento>> {
    const res = await api.get(`/solicitudes/${codigo}/documentos`);
    return res.data;
  },

  async descargar(id: number): Promise<Blob> {
    const res = await api.get(`/documentos/${id}/descargar`, { responseType: 'blob' });
    return res.data;
  },

  async ver(id: number): Promise<Blob> {
    const res = await api.get(`/documentos/${id}/ver`, { responseType: 'blob' });
    return res.data;
  },

  async reemplazar(id: number, file: File): Promise<Documento> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/documentos/${id}/reemplazar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async revisar(id: number, data: RevisarDocumentoDto): Promise<Documento> {
    const res = await api.patch(`/documentos/${id}/revisar`, data);
    return res.data;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/documentos/${id}`);
  },
};
