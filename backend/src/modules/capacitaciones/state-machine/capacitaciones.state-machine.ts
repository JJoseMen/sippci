import { EstadoSolicitud } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * State-machine AISLADO del módulo Capacitaciones (CAPACITACION).
 *
 * El módulo de capacitaciones gestiona participantes (EstadoParticipante)
 * en revision-capacitaciones.service.ts; esta máquina cubre SOLO el nivel
 * de solicitud y NO incluye inspección ni REVISADO intermedio.
 */
const TRANSICIONES_CAPACITACIONES: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  BORRADOR: [EstadoSolicitud.EN_REVISION],
  ENVIADA: [EstadoSolicitud.EN_REVISION],
  EN_REVISION: [
    EstadoSolicitud.APROBADA,
    EstadoSolicitud.OBSERVADA,
    EstadoSolicitud.RECHAZADA,
  ],
  REVISADO: [EstadoSolicitud.APROBADA],
  OBSERVADA: [EstadoSolicitud.ENVIADA],
  INSPECCION_PROGRAMADA: [],
  INFORME_REGISTRADO: [],
  APROBADA: [EstadoSolicitud.CERTIFICADO_EMITIDO, EstadoSolicitud.ANULADA],
  RECHAZADA: [],
  CERTIFICADO_EMITIDO: [EstadoSolicitud.VENCIDO],
  VENCIDO: [EstadoSolicitud.RENOVADO],
  RENOVADO: [],
  ANULADA: [],
};

export class CapacitacionesStateMachine {
  static puedeTransicionar(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): boolean {
    const permitidos = TRANSICIONES_CAPACITACIONES[actual] ?? [];
    return permitidos.includes(nuevo);
  }

  static validarTransicion(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): void {
    if (!this.puedeTransicionar(actual, nuevo)) {
      throw new BadRequestException(
        `No se puede cambiar de ${actual} a ${nuevo} (Capacitaciones). ` +
          `Estados permitidos: [${(TRANSICIONES_CAPACITACIONES[actual] ?? []).join(', ')}]`,
      );
    }
  }

  static obtenerEstadosPermitidos(
    actual: EstadoSolicitud,
  ): EstadoSolicitud[] {
    return TRANSICIONES_CAPACITACIONES[actual] ?? [];
  }
}
