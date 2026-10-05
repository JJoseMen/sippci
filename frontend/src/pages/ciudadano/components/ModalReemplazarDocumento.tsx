import { useState } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';

interface Props {
  abierto: boolean;
  docTipo: string;
  motivo: string;
  cargando: boolean;
  onClose: () => void;
  onConfirmar: (file: File) => void;
}

const MIMES_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_BYTES = 10 * 1024 * 1024;

export function ModalReemplazarDocumento({
  abierto,
  docTipo,
  motivo,
  cargando,
  onClose,
  onConfirmar,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elegir = (f: File | null) => {
    setError(null);
    setFile(null);
    if (!f) return;
    if (!MIMES_PERMITIDOS.includes(f.type)) {
      setError('Tipo no válido. Use PDF o imagen (JPG/PNG/WEBP).');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('El archivo supera el máximo de 10 MB.');
      return;
    }
    setFile(f);
  };

  const confirmar = () => {
    if (file) onConfirmar(file);
  };

  return (
    <Modal
      isOpen={abierto}
      onClose={onClose}
      title={`Reemplazar ${docTipo}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={confirmar}
            disabled={!file || cargando}
            loading={cargando}
          >
            Reemplazar
          </Button>
        </>
      }
    >
      <p>
        <strong>Motivo del rechazo:</strong> {motivo || '—'}
      </p>
      <p>Adjunte el documento corregido. Volverá a PENDIENTE para revisión.</p>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => elegir(e.target.files?.[0] ?? null)}
      />
      {file && <p>Seleccionado: {file.name}</p>}
      {error && <p role="alert">{error}</p>}
    </Modal>
  );
}
