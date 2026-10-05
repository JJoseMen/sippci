import { EstadoSolicitud } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * State-machine AISLADO del módulo Profesionales (REGISTRO_PROFESIONAL).
 *
 * Cubre AMBOS subtipos (NATURAL y JURIDICA) con el MISMO flujo — no crear
 * máquinas separadas por subtipo. El flujo de revisión documental es idéntico.
 *
 * Flujo: BORRADOR -> EN_REVISION -> REVISADO -> APROBADA -> CERTIFICADO_EMITIDO
 *        EN_REVISION -> OBSERVADA (docs rechazados, vía finalizar-revisión)
 *        OBSERVADA -> ENVIADA (reenvío ciudadano) -> EN_REVISION
 *
 * Diferencias vs máquina global / Cumplimiento:
 * - SIN estados de inspección (INSPECCION_PROGRAMADA / INFORME_REGISTRADO).
 * - EN_REVISION puede ir directo a APROBADA (compat: aprobar exige docs
 *   VALIDADOS; el camino preferido es EN_REVISION -> REVISADO -> APROBADA
 *   vía POST finalizar-revision-documentos).
 */
const TRANSICIONES_PROFESIONALES: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  BORRADOR: [EstadoSolicitud.EN_REVISION],
  ENVIADA: [EstadoSolicitud.EN_REVISION],
  EN_REVISION: [
    EstadoSolicitud.REVISADO,
    EstadoSolicitud.APROBADA,
    EstadoSolicitud.OBSERVADA,
    EstadoSolicitud.RECHAZADA,
  ],
  REVISADO: [
    EstadoSolicitud.APROBADA,
    EstadoSolicitud.OBSERVADA,
    EstadoSolicitud.RECHAZADA,
  ],
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

export class ProfesionalesStateMachine {
  static puedeTransicionar(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): boolean {
    const permitidos = TRANSICIONES_PROFESIONALES[actual] ?? [];
    return permitidos.includes(nuevo);
  }

  static validarTransicion(
    actual: EstadoSolicitud,
    nuevo: EstadoSolicitud,
  ): void {
    if (!this.puedeTransicionar(actual, nuevo)) {
      throw new BadRequestException(
        `No se puede cambiar de ${actual} a ${nuevo} (Profesionales). ` +
          `Estados permitidos: [${(TRANSICIONES_PROFESIONALES[actual] ?? []).join(', ')}]`,
      );
    }
  }

  static obtenerEstadosPermitidos(
    actual: EstadoSolicitud,
  ): EstadoSolicitud[] {
    return TRANSICIONES_PROFESIONALES[actual] ?? [];
  }
}
