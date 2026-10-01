import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Badge, Button, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { cumplimientoService, type SolicitudCumplimiento } from '@/services/cumplimiento.service';
import { formatDateTime } from '@/lib/format';
import { ModalJustificacion } from './components/ModalJustificacion';
import { ModalProgramarInspeccion } from './components/ModalProgramarInspeccion';
import { toast } from 'sonner';
import styles from './SolicitudDetallePage.module.scss';

interface Props {
  tipo: 'NATURAL' | 'JURIDICA';
}

export function CumplimientoDetallePage({ tipo }: Props) {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<SolicitudCumplimiento & Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState(false);
  const [modal, setModal] = useState<'observar' | 'rechazar' | null>(null);
  const [modalInspeccion, setModalInspeccion] = useState(false);

  const fetchData = async () => {
    if (!codigo) return;
    setLoading(true);
    try {
      const data =
        tipo === 'NATURAL'
          ? await cumplimientoService.obtenerNatural(codigo)
          : await cumplimientoService.obtenerJuridica(codigo);
      setSolicitud(data as unknown as SolicitudCumplimiento & Record<string, unknown>);
    } catch {
      setSolicitud(null);
      toast.error('No se pudo cargar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, tipo]);

  const handleAprobar = async () => {
    if (!codigo) return;
    setAccionLoading(true);
    try {
      await cumplimientoService.aprobar(codigo);
      toast.success('Solicitud aprobada');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al aprobar';
      toast.error(msg);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleEmitir = async () => {
    if (!codigo) return;
    setAccionLoading(true);
    try {
      await cumplimientoService.emitirCertificado(codigo);
      toast.success('Certificado emitido');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al emitir';
      toast.error(msg);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleProgramarInspeccion = async (data: { fechaProgramada: string; observaciones?: string }) => {
    if (!codigo) return;
    setAccionLoading(true);
    try {
      await cumplimientoService.programarInspeccion(codigo, data);
      toast.success('Inspección programada');
      setModalInspeccion(false);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al programar';
      toast.error(msg);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleModalConfirm = async (justificacion: string) => {
    if (!codigo || !modal) return;
    setAccionLoading(true);
    try {
      if (modal === 'observar') {
        await cumplimientoService.observar(codigo, justificacion);
        toast.success('Solicitud observada');
      } else {
        await cumplimientoService.rechazar(codigo, justificacion);
        toast.success('Solicitud rechazada');
      }
      setModal(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en la acción';
      toast.error(msg);
    } finally {
      setAccionLoading(false);
    }
  };

  if (loading) return <Spinner size="md" />;
  if (!solicitud) {
    return <EmptyState title="No encontrada" description={`Solicitud ${codigo} no existe`} />;
  }

  const datos = (solicitud.datosJson as Record<string, unknown>) || {};
  const historial = (solicitud as Record<string, unknown>).historial as Array<Record<string, unknown>> | undefined;
  const documentos = (solicitud as Record<string, unknown>).documentos as Array<Record<string, unknown>> | undefined;
  const inspecciones = (solicitud as Record<string, unknown>).inspecciones as Array<Record<string, unknown>> | undefined;
  const certificados = (solicitud as Record<string, unknown>).certificados as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  const certSingle = Array.isArray(certificados) ? certificados[0] : certificados as Record<string, unknown> | undefined;

  const estado = solicitud.estado as string;
  const puedeAccionar = ['EN_REVISION', 'REVISADO', 'ENVIADA'].includes(estado);
  const puedeProgramar = estado === 'EN_REVISION';
  const puedeEmitir = estado === 'APROBADA';
  const puedeAprobarInforme = estado === 'INFORME_REGISTRADO';
  const puedeObservarInforme = estado === 'INFORME_REGISTRADO';
  const puedeRechazarInforme = estado === 'INFORME_REGISTRADO';

  const sistemas = datos.sistemasContraIncendios as string[] | undefined;

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Cumplimiento SIPPCI', tipo === 'NATURAL' ? 'Natural' : 'Jurídica', codigo || '']}
        titulo={`Expediente — ${codigo}`}
        subtitulo={`Estado: ${estado} • ${tipo === 'NATURAL' ? 'Persona Natural' : 'Persona Jurídica'}`}
      />

      <div className={styles.headerBadge}>
        <Badge variant={estado === 'APROBADA' ? 'success' : estado === 'RECHAZADA' ? 'danger' : 'info'} size="md">
          {estado}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Datos del Solicitante</h3>
          {tipo === 'NATURAL' ? (
            <div className={styles.fieldList}>
              <div><strong>Nombre:</strong> {solicitud.usuario?.nombre || (datos.nombreCompleto as string) || '-'}</div>
              <div><strong>Email:</strong> {solicitud.usuario?.email || (datos.email as string) || '-'}</div>
              <div><strong>Teléfono:</strong> {solicitud.usuario?.telefono || (datos.telefono as string) || '-'}</div>
              <div><strong>CI:</strong> {(datos.ci as string) || '-'}</div>
            </div>
          ) : (
            <div className={styles.fieldList}>
              <div><strong>Razón Social:</strong> {solicitud.empresa?.razonSocial || (datos.razonSocial as string) || '-'}</div>
              <div><strong>NIT:</strong> {solicitud.empresa?.nit || (datos.nit as string) || '-'}</div>
              <div><strong>Representante:</strong> {(datos.representanteLegal as string) || '-'}</div>
              <div><strong>Email:</strong> {solicitud.usuario?.email || (datos.email as string) || '-'}</div>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Datos del Establecimiento</h3>
          <div className={styles.fieldList}>
            <div><strong>Nombre:</strong> {(datos.nombreEstablecimiento as string) || '-'}</div>
            <div><strong>Dirección:</strong> {(datos.direccion as string) || '-'}</div>
            <div><strong>Zona:</strong> {(datos.zona as string) || '-'}</div>
            <div><strong>Ciudad:</strong> {(datos.ciudad as string) || '-'}</div>
            <div><strong>Actividad:</strong> {(datos.actividadEconomica as string) || '-'}</div>
            <div><strong>Superficie:</strong> {datos.superficieM2 ? `${String(datos.superficieM2)} m²` : '-'}</div>
            <div>
              <strong>Nivel riesgo:</strong>{' '}
              {datos.nivelRiesgo ? (
                <Badge
                  variant={
                    datos.nivelRiesgo === 'ALTO' ? 'danger' : datos.nivelRiesgo === 'MEDIO' ? 'warning' : 'success'
                  }
                  size="sm"
                >
                  {String(datos.nivelRiesgo)}
                </Badge>
              ) : (
                '-'
              )}
            </div>
            <div>
              <strong>Sistemas contra incendio:</strong>{' '}
              {sistemas && sistemas.length > 0 ? sistemas.join(', ') : '-'}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Documentos Adjuntos</h3>
          {!documentos || documentos.length === 0 ? (
            <p className={styles.empty}>Sin documentos</p>
          ) : (
            <ul className={styles.docList}>
              {documentos.map((d) => (
                <li key={String(d.id)} className={styles.docItem}>
                  <span>{String(d.nombreOriginal)}</span>
                  <Badge size="sm" variant={String(d.estado) === 'VALIDADO' ? 'success' : 'neutral'}>
                    {String(d.estado)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Inspecciones</h3>
          {!inspecciones || inspecciones.length === 0 ? (
            <p className={styles.empty}>Sin inspecciones programadas</p>
          ) : (
            <ul className={styles.docList}>
              {inspecciones.map((ins) => (
                <li key={String(ins.id)} className={styles.docItem}>
                  <span>
                    {ins.fechaProgramada ? formatDateTime(String(ins.fechaProgramada)) : '-'} —{' '}
                    {String(ins.estado || '')}
                    {ins.resultado ? ` (${String(ins.resultado)})` : ''}
                  </span>
                  <Badge
                    size="sm"
                    variant={
                      String(ins.estado) === 'CONFORME'
                        ? 'success'
                        : String(ins.estado) === 'NO_CONFORME'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {String(ins.estado)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Historial de Cambios</h3>
          {!historial || historial.length === 0 ? (
            <p className={styles.empty}>Sin historial</p>
          ) : (
            <ul className={styles.timeline}>
              {historial.map((h, idx) => (
                <li key={idx} className={styles.timelineItem}>
                  <span className={styles.timelineEstado}>
                    {String(h.estadoAnterior || '—')} → {String(h.estadoNuevo)}
                  </span>
                  {h.comentario ? <span className={styles.timelineComentario}>{String(h.comentario)}</span> : null}
                  <span className={styles.timelineFecha}>{h.createdAt ? formatDateTime(String(h.createdAt)) : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {certSingle && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Certificado</h3>
            <div className={styles.fieldList}>
              <div><strong>Código:</strong> {String(certSingle.codigoCertificado)}</div>
              <div><strong>Vigencia:</strong> {certSingle.fechaVigencia ? formatDateTime(String(certSingle.fechaVigencia)) : '-'}</div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {puedeAccionar && (
          <>
            <Button variant="primary" size="sm" onClick={handleAprobar} disabled={accionLoading}>
              Aprobar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setModal('observar')} disabled={accionLoading}>
              Observar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setModal('rechazar')} disabled={accionLoading}>
              Rechazar
            </Button>
          </>
        )}
        {puedeProgramar && (
          <Button variant="secondary" size="sm" onClick={() => setModalInspeccion(true)} disabled={accionLoading}>
            Programar Inspección
          </Button>
        )}
        {puedeAprobarInforme && (
          <Button variant="primary" size="sm" onClick={handleAprobar} disabled={accionLoading}>
            Aprobar informe
          </Button>
        )}
        {puedeObservarInforme && (
          <Button variant="secondary" size="sm" onClick={() => setModal('observar')} disabled={accionLoading}>
            Observar informe
          </Button>
        )}
        {puedeRechazarInforme && (
          <Button variant="ghost" size="sm" onClick={() => setModal('rechazar')} disabled={accionLoading}>
            Rechazar informe
          </Button>
        )}
        {puedeEmitir && (
          <Button variant="primary" size="sm" onClick={handleEmitir} disabled={accionLoading}>
            Emitir Certificado
          </Button>
        )}
        {accionLoading && <Spinner size="sm" />}
      </div>

      <ModalJustificacion
        abierto={modal !== null}
        tipo={modal || 'observar'}
        codigoSolicitud={codigo || ''}
        onClose={() => setModal(null)}
        onConfirmar={handleModalConfirm}
      />

      <ModalProgramarInspeccion
        abierto={modalInspeccion}
        codigoSolicitud={codigo || ''}
        onClose={() => setModalInspeccion(false)}
        onConfirmar={handleProgramarInspeccion}
      />
    </div>
  );
}
