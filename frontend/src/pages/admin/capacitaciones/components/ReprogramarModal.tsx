import { useEffect, useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { mensajeError } from '@/lib/error';
import type { Programacion, ReprogramarProgramacionDto } from '@/types/capacitacion.types';
import styles from './capacitaciones.modals.module.scss';

interface Props {
  isOpen: boolean;
  programacion: Programacion | null;
  onClose: () => void;
  onGuardar: (data: ReprogramarProgramacionDto) => Promise<void>;
}

function aLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ReprogramarModal({ isOpen, programacion, onClose, onGuardar }: Props) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !programacion) return;
    setError('');
    setFechaInicio(aLocalInput(programacion.fechaInicio));
    setFechaFin(aLocalInput(programacion.fechaFin));
    setObservaciones('');
  }, [isOpen, programacion]);

  const esValido = fechaInicio !== '';

  const handleGuardar = async () => {
    if (!esValido) {
      setError('La nueva fecha de inicio es obligatoria');
      return;
    }
    if (fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
      setError('La fecha de fin no puede ser anterior a la de inicio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onGuardar({
        fechaInicio: new Date(fechaInicio).toISOString(),
        ...(fechaFin ? { fechaFin: new Date(fechaFin).toISOString() } : {}),
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      });
    } catch (err) {
      setError(mensajeError(err, 'No se pudo reprogramar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reprogramar programación"
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGuardar}
            disabled={!esValido || loading}
            loading={loading}
          >
            Reprogramar
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        {programacion && (
          <p className={styles.subtitle}>
            <strong>#{programacion.id}</strong> — {programacion.curso?.nombre} · actual:{' '}
            {aLocalInput(programacion.fechaInicio).replace('T', ' ')}
          </p>
        )}

        <Input
          label="Nueva fecha y hora de inicio"
          required
          type="datetime-local"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
        />
        <Input
          label="Nueva fecha y hora de fin"
          type="datetime-local"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
        />

        <label className={styles.label} htmlFor="obs-reprogramar">
          Motivo / observaciones
        </label>
        <textarea
          id="obs-reprogramar"
          className={styles.textarea}
          rows={3}
          maxLength={500}
          placeholder="Cambio por feriado..."
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
}
