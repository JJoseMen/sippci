import { useEffect, useState } from 'react';
import { Modal, Button } from '@/components/ui';
import styles from './capacitaciones.modals.module.scss';

interface Props {
  isOpen: boolean;
  titulo: string;
  mensaje: string;
  nombreParticipante: string;
  onClose: () => void;
  onConfirmar: (justificacion: string) => void | Promise<void>;
}

const MINIMO = 10;

export function JustificacionModal({
  isOpen,
  titulo,
  mensaje,
  nombreParticipante,
  onClose,
  onConfirmar,
}: Props) {
  const [valor, setValor] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValor('');
    setError('');
  }, [isOpen]);

  const handleConfirmar = async () => {
    const texto = valor.trim();
    if (texto.length < MINIMO) {
      setError(`La justificación debe tener al menos ${MINIMO} caracteres`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onConfirmar(texto);
    } catch {
      setError('No se pudo registrar la justificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirmar} loading={loading}>
            Continuar
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.subtitle}>
          {mensaje}
          {nombreParticipante ? (
            <>
              {' '}
              de <strong>{nombreParticipante}</strong>.
            </>
          ) : null}
        </p>

        <label className={styles.label} htmlFor="justificacion-participante">
          Justificación (mínimo {MINIMO} caracteres)
        </label>
        <textarea
          id="justificacion-participante"
          className={styles.textarea}
          rows={4}
          maxLength={500}
          value={valor}
          placeholder="Describa el motivo de la corrección"
          onChange={(e) => setValor(e.target.value)}
        />

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
}
