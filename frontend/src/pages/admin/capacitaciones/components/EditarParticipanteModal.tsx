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
  { value: 'ABANDONO', label: 'Abandono' },
];

const OPCIONES_SI_NO: { value: string; label: string }[] = [
  { value: '', label: 'No cambiar' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
];

export function EditarParticipanteModal({ isOpen, inscripcion, onClose, onGuardar }: Props) {
  const [estado, setEstado] = useState('');
  const [asistencia, setAsistencia] = useState('');
  const [aprobado, setAprobado] = useState('');
  const [puntaje, setPuntaje] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !inscripcion) return;
    setEstado('');
    setAsistencia(inscripcion.asistencia === null ? '' : String(inscripcion.asistencia));
    setAprobado(inscripcion.aprobado === null ? '' : String(inscripcion.aprobado));
    setPuntaje(inscripcion.puntaje != null ? String(inscripcion.puntaje) : '');
    setObservaciones(inscripcion.observaciones ?? '');
    setError('');
  }, [isOpen, inscripcion]);

  const handleGuardar = async () => {
    if (puntaje !== '' && (Number(puntaje) < 0 || Number(puntaje) > 100)) {
      setError('El puntaje debe estar entre 0 y 100');
      return;
    }

    const data: ActualizarEstadoParticipanteDto = {};
    if (estado) data.estado = estado as EstadoParticipante;
    if (asistencia) data.asistencia = asistencia === 'true';
    if (aprobado) data.aprobado = aprobado === 'true';
    if (puntaje !== '') data.puntaje = Number(puntaje);
    if (observaciones !== (inscripcion?.observaciones ?? '')) {
      data.observaciones = observaciones;
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

        <div className={styles.grid}>
          <Select
            label="Asistió"
            value={asistencia}
            onChange={(e) => setAsistencia(e.target.value)}
            options={OPCIONES_SI_NO}
          />
          <Select
            label="Aprobado"
            value={aprobado}
            onChange={(e) => setAprobado(e.target.value)}
            options={OPCIONES_SI_NO}
          />
        </div>

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

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
}
