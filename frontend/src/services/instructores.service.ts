import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/common.types';
import type {
  ActualizarInstructorDto,
  CrearInstructorDto,
  Instructor,
} from '@/types/capacitacion.types';

const BASE = '/admin/sippci/capacitaciones/instructores';

export const instructoresService = {
  async listar(
    params: { search?: string; activo?: boolean; page?: number; limit?: number } = {},
  ): Promise<PaginatedResponse<Instructor>> {
    const res = await api.get(BASE, {
      params: {
        ...(params.search ? { search: params.search } : {}),
        ...(params.activo !== undefined ? { activo: String(params.activo) } : {}),
        ...(params.page ? { page: params.page } : {}),
        limit: params.limit ?? 100,
      },
    });
    return res.data;
  },

  async obtener(id: number): Promise<Instructor> {
    const res = await api.get(`${BASE}/${id}`);
    return res.data;
  },

  async crear(data: CrearInstructorDto): Promise<Instructor> {
    const res = await api.post(BASE, data);
    return res.data;
  },

  async actualizar(id: number, data: ActualizarInstructorDto): Promise<Instructor> {
    const res = await api.put(`${BASE}/${id}`, data);
    return res.data;
  },

  async desactivar(id: number): Promise<{ message: string }> {
    const res = await api.delete(`${BASE}/${id}`);
    return res.data;
  },
};
