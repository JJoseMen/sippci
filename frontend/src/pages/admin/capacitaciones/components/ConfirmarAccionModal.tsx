import { Modal, Button } from '@/components/ui';
import styles from './capacitaciones.modals.module.scss';

interface Props {
  isOpen: boolean;
  titulo: string;
  mensaje: string;
  etiquetaConfirmar?: string;
  confirmarCargando?: boolean;
  onClose: () => void;
  onConfirmar: () => void | Promise<void>;
}

export function ConfirmarAccionModal({
  isOpen,
  titulo,
  mensaje,
  etiquetaConfirmar = 'Confirmar',
  confirmarCargando = false,
  onClose,
  onConfirmar,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={confirmarCargando}>
            Volver
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onConfirmar()}
            loading={confirmarCargando}
          >
            {etiquetaConfirmar}
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.subtitle}>{mensaje}</p>
      </div>
    </Modal>
  );
}
