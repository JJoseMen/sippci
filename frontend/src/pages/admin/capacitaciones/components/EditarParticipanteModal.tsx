import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { mensajeError } from '@/lib/error';
import type {
  ActualizarEstadoParticipanteDto,
  EstadoParticipante,
  InscripcionParticipante,
} from '@/types/capacitacion.types';
import styles from './capacitaciones.modals.module.scss';

interface Props {
  isOpen: boolean;
  inscripcion: InscripcionParticipante | null;
  onClose: () => void;
  onGuardar: (data: ActualizarEstadoParticipanteDto) => Promise<void>;
}

const OPCIONES_ESTADO: { value: string; label: string }[] = [
  { value: '', label: 'No cambiar' },
  { value: 'INSCRITO', label: 'Inscrito' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'REPROBADO', label: 'Reprobado' },
];

const MINIMO_JUSTIFICACION = 10;

export function EditarParticipanteModal({ isOpen, inscripcion, onClose, onGuardar }: Props) {
  const [estado, setEstado] = useState('');
  const [puntaje, setPuntaje] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !inscripcion) return;
    setEstado('');
    setPuntaje(inscripcion.puntaje != null ? String(inscripcion.puntaje) : '');
    setObservaciones(inscripcion.observaciones ?? '');
    setJustificacion('');
    setError('');
  }, [isOpen, inscripcion]);

  const estadoPrevia = inscripcion?.participante?.estado;
  const exigeJustificacion =
    Boolean(estadoPrevia) &&
    estadoPrevia !== 'INSCRITO' &&
    estado !== '' &&
    estado !== estadoPrevia;

  const handleGuardar = async () => {
    if (puntaje !== '' && (Number(puntaje) < 0 || Number(puntaje) > 100)) {
      setError('El puntaje debe estar entre 0 y 100');
      return;
    }

    if (exigeJustificacion && justificacion.trim().length < MINIMO_JUSTIFICACION) {
      setError(
        `La justificación es obligatoria al corregir un resultado previo (mínimo ${MINIMO_JUSTIFICACION} caracteres)`,
      );
      return;
    }

    const data: ActualizarEstadoParticipanteDto = {};
    if (estado) data.estado = estado as EstadoParticipante;
    if (puntaje !== '') data.puntaje = Number(puntaje);
    if (observaciones !== (inscripcion?.observaciones ?? '')) {
      data.observaciones = observaciones;
    }
    if (exigeJustificacion && justificacion.trim()) {
      data.justificacion = justificacion.trim();
    }

    if (Object.keys(data).length === 0) {
      setError('Indique al menos un campo a actualizar');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onGuardar(data);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo actualizar al participante'));
    } finally {
      setLoading(false);
    }
  };

  const persona = inscripcion?.participante;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Actualizar participante"
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleGuardar} loading={loading}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.subtitle}>
          {persona ? (
            <>
              <strong>{persona.nombre}</strong> · CI {persona.ci}
            </>
          ) : (
            `Participante #${inscripcion?.participanteId}`
          )}
        </p>

        <Select
          label="Estado de la persona"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          options={OPCIONES_ESTADO}
        />

        <Input
          label="Puntaje (0 - 100)"
          type="number"
          min={0}
          max={100}
          value={puntaje}
          placeholder="Sin cambio"
          onChange={(e) => setPuntaje(e.target.value)}
        />

        <label className={styles.label} htmlFor="obs-participante">
          Observaciones
        </label>
        <textarea
          id="obs-participante"
          className={styles.textarea}
          rows={3}
          maxLength={500}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        {exigeJustificacion && (
          <>
            <label className={styles.label} htmlFor="justificacion-editar">
              Justificación (obligatoria al corregir un resultado previo)
            </label>
            <textarea
              id="justificacion-editar"
              className={styles.textarea}
              rows={3}
              maxLength={500}
              value={justificacion}
              placeholder="Describa el motivo de la corrección"
              onChange={(e) => setJustificacion(e.target.value)}
            />
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
}
