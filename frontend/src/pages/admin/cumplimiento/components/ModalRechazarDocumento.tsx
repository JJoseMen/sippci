import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';

interface Props {
  abierto: boolean;
  docTipo: string;
  nombreArchivo: string;
  cargando: boolean;
  onClose: () => void;
  onConfirmar: (motivo: string) => void;
}

export function ModalRechazarDocumento({
  abierto,
  docTipo,
  nombreArchivo,
  cargando,
  onClose,
  onConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (abierto) setMotivo('');
  }, [abierto]);

  const valido = motivo.trim().length >= 10;

  return (
    <Modal
      isOpen={abierto}
      onClose={onClose}
      title={`Rechazar ${docTipo}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirmar(motivo.trim())}
            disabled={!valido || cargando}
            loading={cargando}
          >
            Rechazar
          </Button>
        </>
      }
    >
      <p>Documento: {nombreArchivo}</p>
      <p>Motivo del rechazo (mínimo 10 caracteres):</p>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={4}
        style={{ width: '100%' }}
      />
      {!valido && motivo.length > 0 && (
        <p role="alert">Mínimo 10 caracteres.</p>
      )}
    </Modal>
  );
}
