import { useEffect, useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { mensajeError } from '@/lib/error';
import type { CrearInstructorDto, Instructor } from '@/types/capacitacion.types';
import styles from './capacitaciones.modals.module.scss';

interface Props {
  isOpen: boolean;
  instructor?: Instructor | null;
  onClose: () => void;
  onGuardar: (data: CrearInstructorDto) => Promise<void>;
}

export function InstructorFormModal({ isOpen, instructor, onClose, onGuardar }: Props) {
  const esEdicion = Boolean(instructor);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [ci, setCi] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setNombre(instructor?.nombre ?? '');
    setApellido(instructor?.apellido ?? '');
    setCi(instructor?.ci ?? '');
    setEmail(instructor?.email ?? '');
    setTelefono(instructor?.telefono ?? '');
    setEspecialidad(instructor?.especialidad ?? '');
  }, [isOpen, instructor]);

  const esValido = nombre.trim().length > 0 && apellido.trim().length > 0 && ci.trim().length > 0;

  const handleGuardar = async () => {
    if (!esValido) {
      setError('Nombre, apellido y CI son obligatorios');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('El email no tiene un formato válido');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data: CrearInstructorDto = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        ci: ci.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
        ...(especialidad.trim() ? { especialidad: especialidad.trim() } : {}),
      };
      await onGuardar(data);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el instructor'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esEdicion ? 'Editar instructor' : 'Nuevo instructor'}
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
          <Input
            label="Nombre"
            required
            value={nombre}
            maxLength={100}
            placeholder="Juan"
            onChange={(e) => setNombre(e.target.value)}
          />
          <Input
            label="Apellido"
            required
            value={apellido}
            maxLength={100}
            placeholder="Perez Lopez"
            onChange={(e) => setApellido(e.target.value)}
          />
        </div>

        <div className={styles.grid}>
          <Input
            label="CI"
            required
            value={ci}
            maxLength={20}
            placeholder="12345678"
            onChange={(e) => setCi(e.target.value)}
          />
          <Input
            label="Especialidad"
            value={especialidad}
            maxLength={100}
            placeholder="Prevención de Incendios"
            onChange={(e) => setEspecialidad(e.target.value)}
          />
        </div>

        <div className={styles.grid}>
          <Input
            label="Email"
            type="email"
            value={email}
            maxLength={150}
            placeholder="juan@email.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Teléfono"
            value={telefono}
            maxLength={20}
            placeholder="71234567"
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        {esEdicion && (
          <p className={styles.hint}>
            Para desactivar o volver a habilitar el instructor use los botones de la tabla.
          </p>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
}
