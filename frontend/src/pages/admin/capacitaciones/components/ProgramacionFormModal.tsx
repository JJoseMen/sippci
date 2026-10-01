import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { mensajeError } from '@/lib/error';
import type {
  CrearProgramacionDto,
  Curso,
  Instructor,
  Programacion,
} from '@/types/capacitacion.types';
import styles from './capacitaciones.modals.module.scss';

interface Props {
  isOpen: boolean;
  programacion?: Programacion | null;
  cursos: Curso[];
  instructores: Instructor[];
  onClose: () => void;
  onGuardar: (data: CrearProgramacionDto) => Promise<void>;
}

function aLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ProgramacionFormModal({
  isOpen,
  programacion,
  cursos,
  instructores,
  onClose,
  onGuardar,
}: Props) {
  const esEdicion = Boolean(programacion);

  const [cursoId, setCursoId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [lugar, setLugar] = useState('');
  const [cupo, setCupo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setCursoId(programacion ? String(programacion.cursoId) : '');
    setInstructorId(programacion?.instructorId ? String(programacion.instructorId) : '');
    setFechaInicio(programacion ? aLocalInput(programacion.fechaInicio) : '');
    setFechaFin(programacion ? aLocalInput(programacion.fechaFin) : '');
    setLugar(programacion?.lugar ?? '');
    setCupo(programacion?.cupo != null ? String(programacion.cupo) : '');
    setObservaciones(programacion?.observaciones ?? '');
  }, [isOpen, programacion]);

  const esValido = cursoId !== '' && fechaInicio !== '';

  const handleGuardar = async () => {
    if (!esValido) {
      setError('Curso y fecha de inicio son obligatorios');
      return;
    }
    if (fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
      setError('La fecha de fin no puede ser anterior a la de inicio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data: CrearProgramacionDto = {
        cursoId: Number(cursoId),
        fechaInicio: new Date(fechaInicio).toISOString(),
        ...(instructorId ? { instructorId: Number(instructorId) } : {}),
        ...(fechaFin ? { fechaFin: new Date(fechaFin).toISOString() } : {}),
        ...(lugar.trim() ? { lugar: lugar.trim() } : {}),
        ...(cupo.trim() ? { cupo: Number(cupo) } : {}),
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      };
      await onGuardar(data);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la programación'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esEdicion ? 'Editar programación' : 'Nueva programación'}
      size="lg"
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
            {esEdicion ? 'Guardar cambios' : 'Crear'}
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.grid}>
          <Select
            label="Curso"
            required
            value={cursoId}
            onChange={(e) => setCursoId(e.target.value)}
            options={[
              { value: '', label: 'Seleccione un curso' },
              ...cursos.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />
          <Select
            label="Instructor"
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            options={[
              { value: '', label: 'Sin instructor' },
              ...instructores
                .filter((i) => i.activo)
                .map((i) => ({
                  value: String(i.id),
                  label: `${i.nombre} ${i.apellido}`.trim(),
                })),
            ]}
          />
        </div>

        <div className={styles.grid}>
          <Input
            label="Fecha y hora de inicio"
            required
            type="datetime-local"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <Input
            label="Fecha y hora de fin"
            type="datetime-local"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        <div className={styles.grid}>
          <Input
            label="Lugar"
            value={lugar}
            maxLength={200}
            placeholder="Aula 1"
            onChange={(e) => setLugar(e.target.value)}
          />
          <Input
            label="Cupo"
            type="number"
            min={1}
            value={cupo}
            placeholder="Sin límite"
            onChange={(e) => setCupo(e.target.value)}
          />
        </div>

        <label className={styles.label} htmlFor="obs-programacion">
          Observaciones
        </label>
        <textarea
          id="obs-programacion"
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
