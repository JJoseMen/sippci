import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Input } from '@/components/ui';
import { toast } from 'sonner';
import { declaracionesService } from '@/services/declaraciones.service';
import { solicitudesService } from '@/services/solicitudes.service';
import { descargarBlob } from '@/lib/download';
import type { DeclaracionJurada } from '@/types/declaracion.types';
import { RevisionParticipantes } from './RevisionParticipantes';
import styles from './RevisionDocumentosPage.module.scss';

const DOCS = [
  { tipo: 'CI_ANVERSO', estado: 'PENDIENTE' },
  { tipo: 'PLANO', estado: 'PENDIENTE' },
];

const BADGE_ESTADO: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'neutral'> = {
  PENDIENTE: 'warning',
  GENERADA: 'warning',
  FIRMADA_SUBIDA: 'info',
  APROBADA: 'success',
  RECHAZADA: 'danger',
};

export function RevisionDocumentosPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [declaracion, setDeclaracion] = useState<DeclaracionJurada | null>(null);
  const [observacion, setObservacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [esCapacitacion, setEsCapacitacion] = useState(false);

  const cargar = useCallback(async () => {
    if (!codigo) return;
    try {
      const dj = await declaracionesService.findOne(codigo);
      setDeclaracion(dj);
    } catch {
      setDeclaracion(null);
    }
    try {
      const sol = await solicitudesService.findOne(codigo);
      setEsCapacitacion(sol.tipoTramite === 'CAPACITACION');
    } catch {
      setEsCapacitacion(false);
    }
  }, [codigo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const descargarPdf = async (firmado: boolean) => {
    if (!declaracion || !codigo) return;
    setCargando(true);
    try {
      const nombre = firmado
        ? `${declaracion.codigoDeclaracion}_FIRMADO.pdf`
        : `${declaracion.codigoDeclaracion}.pdf`;
      const blob = firmado
        ? await declaracionesService.descargarFirmado(declaracion.id)
        : await declaracionesService.descargarGenerado(codigo);
      descargarBlob(blob, nombre);
    } catch (e) {
      console.log('error descargar dj', e);
      toast.error('No se pudo descargar el PDF');
    } finally {
      setCargando(false);
    }
  };

  const resolver = async (accion: 'aprobar' | 'rechazar') => {
    if (!declaracion) return;
    setCargando(true);
    try {
      const dj =
        accion === 'aprobar'
          ? await declaracionesService.aprobar(declaracion.id, observacion || undefined)
          : await declaracionesService.rechazar(declaracion.id, observacion || undefined);
      setDeclaracion(dj);
      setObservacion('');
      toast.success(`Declaracion ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}`);
    } catch (e) {
      console.log('error resolver dj', e);
      toast.error('No se pudo resolver la declaracion');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles['page']}>
      <h1 className={styles['title']}>Revision: {codigo}</h1>

      <h2 className={styles['subtitle']}>Declaracion Jurada</h2>
      {declaracion ? (
        <div className={styles['doc']}>
          <div>
            <strong>{declaracion.codigoDeclaracion}</strong>
            <br />
            <Badge variant={BADGE_ESTADO[declaracion.estado] ?? 'neutral'} size="sm">
              {declaracion.estado}
            </Badge>
            <br />
            <span className={styles['meta']}>
              Firmante: {declaracion.firmadoPor} (CI/NIT {declaracion.ciFirmante})
            </span>
            {declaracion.fechaFirma && (
              <>
                <br />
                <span className={styles['meta']}>
                  Firmada el: {new Date(declaracion.fechaFirma).toLocaleString()}
                </span>
              </>
            )}
            {declaracion.observacion && (
              <>
                <br />
                <span className={styles['meta']}>Observacion: {declaracion.observacion}</span>
              </>
            )}
          </div>
          <div className={styles['row']}>
            <Button
              variant="secondary"
              size="sm"
              loading={cargando}
              onClick={() => descargarPdf(false)}
            >
              Ver PDF generado
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={cargando}
              disabled={!declaracion.pdfFirmadoRuta}
              onClick={() => descargarPdf(true)}
            >
              Ver PDF firmado
            </Button>
          </div>
          <Input
            label="Observacion (opcional)"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
          <div className={styles['row']}>
            <Button
              variant="primary"
              size="sm"
              loading={cargando}
              disabled={declaracion.estado !== 'FIRMADA_SUBIDA'}
              onClick={() => resolver('aprobar')}
            >
              Aprobar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={cargando}
              disabled={!['FIRMADA_SUBIDA', 'GENERADA'].includes(declaracion.estado)}
              onClick={() => resolver('rechazar')}
            >
              Rechazar
            </Button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#777' }}>Sin declaracion jurada generada.</p>
      )}

      <h2 className={styles['subtitle']}>Documentos</h2>
      {DOCS.map((d) => (
        <div key={d.tipo} className={styles['doc']}>
          <div>
            <strong>{d.tipo}</strong>
            <br />
            <Badge variant="warning" size="sm">
              {d.estado}
            </Badge>
          </div>
          <div className={styles['row']}>
            <Button variant="primary" size="sm">
              Aprobar
            </Button>
            <Button variant="ghost" size="sm">
              Rechazar
            </Button>
          </div>
        </div>
      ))}
      <Button variant="secondary">Dar visto bueno (REVISADO)</Button>

      {esCapacitacion && codigo && <RevisionParticipantes codigo={codigo} />}
    </div>
  );
}
