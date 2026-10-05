import { EstadoSolicitud } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * State-machine AISLADO del módulo Cumplimiento (CERTIFICACION_SIPPCI).
 *
 * Único dueño del flujo con inspecciones. Ningún otro módulo debe usar
 * INSPECCION_PROGRAMADA / INFORME_REGISTRADO.
 *
 * FIX 3 — Inspección OBLIGATORIA (decisión usuario):
 * - EN_REVISION NO va a APROBADA directo ni a REVISADO: solo
 *   OBSERVADA / RECHAZADA / INSPECCION_PROGRAMADA.
 * - aprobar() solo desde INFORME_REGISTRADO.
 * - INSPECCION_PROGRAMADA conserva RECHAZADA (CANCELADO no existe en el
 *   enum EstadoSolicitud y se evita migración).
 * - INFORME_REGISTRADO conserva RECHAZADA (botón "Rechazar informe" UI/E2E).
 */
const TRANSICIONES_CUMPLIMIENTO: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  BORRADOR: [EstadoSolicitud.EN_REVISION],
  ENVIADA: [EstadoSolicitud.EN_REVISION],
  EN_REVISION: [
    EstadoSolicitud.OBSERVADA,
    EstadoSolicitud.RECHAZADA,
    EstadoSolicitud.INSPECCION_PROGRAMADA,
  ],
  REVISADO: [
    EstadoSolicitud.APROBADA,
    EstadoSolicitud.OBSERVADA,
    EstadoSolicitud.RECHAZADA,
  ],
  OBSERVADA: [EstadoSolicitud.ENVIADA],
  INSPECCION_PROGRAMADA: [
    EstadoSolicitud.INFORME_REGISTRADO,
    EstadoSolicitud.RECHAZADA,
  ],
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

export class CumplimientoStateMachine {
  static puedeTransicionar(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): boolean {
    const permitidos = TRANSICIONES_CUMPLIMIENTO[actual] ?? [];
    return permitidos.includes(nuevo);
  }

  static validarTransicion(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): void {
    if (!this.puedeTransicionar(actual, nuevo)) {
      throw new BadRequestException(
        `No se puede cambiar de ${actual} a ${nuevo} (Cumplimiento). ` +
          `Estados permitidos: [${(TRANSICIONES_CUMPLIMIENTO[actual] ?? []).join(', ')}]`,
      );
    }
  }

  static obtenerEstadosPermitidos(
    actual: EstadoSolicitud,
  ): EstadoSolicitud[] {
    return TRANSICIONES_CUMPLIMIENTO[actual] ?? [];
  }
}
