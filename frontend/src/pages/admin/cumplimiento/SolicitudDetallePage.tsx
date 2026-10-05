import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Badge, Button, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { cumplimientoService, type SolicitudCumplimiento } from '@/services/cumplimiento.service';
import { documentosService } from '@/services/documentos.service';
import { formatDateTime } from '@/lib/format';
import { descargarBlob } from '@/lib/download';
import { ModalJustificacion } from './components/ModalJustificacion';
import { ModalProgramarInspeccion } from './components/ModalProgramarInspeccion';
import { ModalVerDocumento } from './components/ModalVerDocumento';
import { ModalRechazarDocumento } from './components/ModalRechazarDocumento';
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
  const [verDoc, setVerDoc] = useState<{
    nombre: string;
    tipo: string;
    blob: Blob | null;
    blobUrl: string | null;
    mime: string;
  } | null>(null);
  const [rechazo, setRechazo] = useState<{
    id: number;
    tipo: string;
    nombre: string;
  } | null>(null);

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

  // ===== Revisión individual por documento (NATURAL/JURIDICA/INFRA sin distinción) =====
  const handleValidarDoc = async (id: number) => {
    setAccionLoading(true);
    try {
      await documentosService.revisar(id, { estado: 'VALIDADO' });
      toast.success('Documento validado');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al validar';
      toast.error(msg);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleRechazarDoc = async (motivo: string) => {
    if (!rechazo) return;
    setAccionLoading(true);
    try {
      await documentosService.revisar(rechazo.id, {
        estado: 'RECHAZADO',
        observacion: motivo,
      });
      toast.success('Documento rechazado');
      setRechazo(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al rechazar';
      toast.error(msg);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleDescargarDoc = async (id: number, nombre: string) => {
    try {
      const blob = await documentosService.descargar(id);
      descargarBlob(blob, nombre);
    } catch {
      toast.error('No se pudo descargar el documento');
    }
  };

  const handleVerDoc = async (id: number, nombre: string, tipo: string) => {
    try {
      const blob = await documentosService.ver(id);
      const blobUrl = URL.createObjectURL(blob);
      setVerDoc({ nombre, tipo, blob, blobUrl, mime: blob.type });
    } catch {
      toast.error('No se pudo abrir el documento');
    }
  };

  const cerrarVer = () => {
    if (verDoc?.blobUrl) URL.revokeObjectURL(verDoc.blobUrl);
    setVerDoc(null);
  };

  const handleFinalizar = async () => {
    if (!codigo) return;
    setAccionLoading(true);
    try {
      const r = await cumplimientoService.finalizarRevision(codigo);
      if (r.todosValidados) {
        toast.success(
          `Revisión finalizada: ${r.validados}/${r.total} validados. Ya puede programar la inspección.`,
        );
      } else {
        toast.warning(
          `Solicitud observada: ${r.rechazados} documento(s) rechazado(s). Se notificó al ciudadano.`,
        );
      }
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al finalizar';
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
  const enInforme = estado === 'INFORME_REGISTRADO';
  const puedeEmitir = estado === 'APROBADA';
  const puedeAprobarInforme = enInforme;
  const puedeObservarInforme = enInforme;
  const puedeRechazarInforme = enInforme;

  // ===== Contadores y gating (idéntico NATURAL/JURIDICA/INFRA) =====
  const docs = (documentos ?? []) as Array<Record<string, unknown>>;
  const totalDocs = docs.length;
  const validados = docs.filter((d) => String(d.estado) === 'VALIDADO').length;
  const pendientes = docs.filter((d) => String(d.estado) === 'PENDIENTE').length;
  const rechazados = docs.filter((d) => String(d.estado) === 'RECHAZADO').length;
  const enRevision = ['EN_REVISION', 'ENVIADA'].includes(estado);
  const todosRevisados = totalDocs > 0 && pendientes === 0;
  const todosValidados = totalDocs > 0 && validados === totalDocs;
  const revisadoPor = (solicitud as Record<string, unknown>).revisadoPorId;
  // Inspección obligatoria: programar solo tras finalizar OK (docs OK + revisadoPor).
  const puedeProgramar =
    estado === 'EN_REVISION' && todosValidados && !!revisadoPor && !accionLoading;
  const puedeFinalizar = enRevision && todosRevisados && !accionLoading;
  // Aprobar SOLO tras informe CONFORME (FIX 3); visible pero deshabilitado
  // antes para no romper E2E ni el flujo con inspección.
  const puedeAprobar = enInforme && !accionLoading;
  const puedeRevisarDocs = enRevision && !accionLoading;

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
          <h3 className={styles.cardTitle}>
            Documentos Adjuntos{' '}
            {totalDocs > 0 && (
              <span>
                ({validados}/{totalDocs} validados
                {pendientes > 0 && ` • ${pendientes} pendientes`}
                {rechazados > 0 && ` • ${rechazados} rechazados`})
              </span>
            )}
          </h3>
          {!documentos || documentos.length === 0 ? (
            <p className={styles.empty}>Sin documentos</p>
          ) : (
            <ul className={styles.docList}>
              {documentos.map((d) => {
                const dd = d as unknown as Record<string, unknown>;
                const id = Number(dd.id);
                const est = String(dd.estado);
                return (
                  <li key={String(dd.id)} className={styles.docItem}>
                    <div className={styles.docInfo}>
                      <span className={styles.docTipo}>
                        {String(dd.tipo ?? 'DOCUMENTO')}
                      </span>
                      <span>{String(dd.nombreOriginal)}</span>
                      <Badge
                        size="sm"
                        variant={
                          est === 'VALIDADO'
                            ? 'success'
                            : est === 'RECHAZADO'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {est}
                      </Badge>
                      {est === 'RECHAZADO' && dd.observaciones ? (
                        <span className={styles.docMotivo}>
                          {String(dd.observaciones)}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.docActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleVerDoc(id, String(dd.nombreOriginal), String(dd.tipo ?? ''))
                        }
                      >
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDescargarDoc(id, String(dd.nombreOriginal))
                        }
                      >
                        Descargar
                      </Button>
                      {puedeRevisarDocs && est !== 'VALIDADO' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleValidarDoc(id)}
                          disabled={accionLoading}
                        >
                          Validar
                        </Button>
                      )}
                      {puedeRevisarDocs && est !== 'RECHAZADO' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setRechazo({
                              id,
                              tipo: String(dd.tipo ?? 'DOCUMENTO'),
                              nombre: String(dd.nombreOriginal),
                            })
                          }
                          disabled={accionLoading}
                        >
                          Rechazar
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {enRevision && totalDocs > 0 && !todosRevisados && (
            <p className={styles.empty}>
              Revise cada documento (Validar / Rechazar con motivo ≥10). El
              botón Finalizar se habilita cuando no queden PENDIENTES.
            </p>
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
        {enRevision && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleFinalizar}
            disabled={!puedeFinalizar}
            title={
              todosRevisados
                ? 'Finalizar revisión documental'
                : `Faltan ${pendientes} documento(s) por revisar`
            }
          >
            Finalizar revisión ({validados}/{totalDocs})
          </Button>
        )}
        {puedeAccionar && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAprobar}
              disabled={!puedeAprobar}
              title={
                puedeAprobar
                  ? 'Aprobar solicitud'
                  : 'Solo tras informe de inspección CONFORME (inspección obligatoria)'
              }
            >
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
        {estado === 'EN_REVISION' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalInspeccion(true)}
            disabled={!puedeProgramar}
            title={
              puedeProgramar
                ? 'Programar inspección técnica'
                : 'Finalice la revisión documental con todos los documentos VALIDADOS'
            }
          >
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

      {verDoc && (
        <ModalVerDocumento
          abierto={verDoc !== null}
          titulo={`${verDoc.tipo} — ${verDoc.nombre}`}
          nombreArchivo={verDoc.nombre}
          blobUrl={verDoc.blobUrl}
          mimeType={verDoc.mime}
          blob={verDoc.blob}
          onClose={cerrarVer}
        />
      )}

      {rechazo && (
        <ModalRechazarDocumento
          abierto={rechazo !== null}
          docTipo={rechazo.tipo}
          nombreArchivo={rechazo.nombre}
          cargando={accionLoading}
          onClose={() => setRechazo(null)}
          onConfirmar={handleRechazarDoc}
        />
      )}
    </div>
  );
}
