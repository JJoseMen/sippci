import { EstadoSolicitud } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

const TRANSICIONES: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  BORRADOR: [EstadoSolicitud.ENVIADA],
  ENVIADA: [EstadoSolicitud.EN_REVISION],
  EN_REVISION: [
    EstadoSolicitud.REVISADO,
    EstadoSolicitud.OBSERVADA,
    EstadoSolicitud.RECHAZADA,
    EstadoSolicitud.INSPECCION_PROGRAMADA,
  ],
  REVISADO: [EstadoSolicitud.APROBADA],
  OBSERVADA: [EstadoSolicitud.ENVIADA],
  INSPECCION_PROGRAMADA: [EstadoSolicitud.INFORME_REGISTRADO, EstadoSolicitud.RECHAZADA],
  INFORME_REGISTRADO: [
    EstadoSolicitud.REVISADO,
    EstadoSolicitud.APROBADA,
    EstadoSolicitud.OBSERVADA,
    EstadoSolicitud.RECHAZADA,
  ],
  APROBADA: [EstadoSolicitud.CERTIFICADO_EMITIDO, EstadoSolicitud.ANULADA],
  RECHAZADA: [],
  CERTIFICADO_EMITIDO: [EstadoSolicitud.VENCIDO],
  VENCIDO: [EstadoSolicitud.RENOVADO],
  RENOVADO: [],
  ANULADA: [],
};

export class SolicitudStateMachine {
  static puedeTransicionar(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): boolean {
    const permitidos = TRANSICIONES[actual] ?? [];
    return permitidos.includes(nuevo);
  }

  static validarTransicion(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): void {
    if (!this.puedeTransicionar(actual, nuevo)) {
      throw new BadRequestException(
        `No se puede cambiar de ${actual} a ${nuevo}. ` +
          `Estados permitidos: [${(TRANSICIONES[actual] ?? []).join(', ')}]`,
      );
    }
  }

  static obtenerEstadosPermitidos(
    actual: EstadoSolicitud,
  ): EstadoSolicitud[] {
    return TRANSICIONES[actual] ?? [];
  }
}
