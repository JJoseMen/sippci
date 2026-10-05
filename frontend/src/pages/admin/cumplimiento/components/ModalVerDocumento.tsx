import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { descargarBlob } from '@/lib/download';

interface Props {
  abierto: boolean;
  titulo: string;
  nombreArchivo: string;
  blobUrl: string | null;
  mimeType: string;
  blob: Blob | null;
  onClose: () => void;
}

export function ModalVerDocumento({
  abierto,
  titulo,
  nombreArchivo,
  blobUrl,
  mimeType,
  blob,
  onClose,
}: Props) {
  const esPdf = mimeType.includes('pdf');
  const esImagen = mimeType.startsWith('image/');

  const handleDescargar = () => {
    if (blob) descargarBlob(blob, nombreArchivo);
  };

  return (
    <Modal
      isOpen={abierto}
      onClose={onClose}
      title={titulo}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleDescargar}>
            Descargar
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      {!blobUrl ? (
        <p>Cargando documento…</p>
      ) : esPdf ? (
        <iframe
          title={nombreArchivo}
          src={blobUrl}
          width="100%"
          height="480"
          style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}
        />
      ) : esImagen ? (
        <img
          src={blobUrl}
          alt={nombreArchivo}
          style={{ maxWidth: '100%', borderRadius: 8 }}
        />
      ) : (
        <p>
          Vista previa no disponible para este tipo de archivo. Use Descargar
          para verlo.
        </p>
      )}
    </Modal>
  );
}
