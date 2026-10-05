import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Badge, Button, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { profesionalesService, type SolicitudProfesional } from '@/services/profesionales.service';
import { documentosService } from '@/services/documentos.service';
import { formatDateTime } from '@/lib/format';
import { descargarBlob } from '@/lib/download';
import { ModalJustificacion } from './components/ModalJustificacion';
import { toast } from 'sonner';
import styles from './SolicitudDetallePage.module.scss';

interface Props {
  tipo: 'NATURAL' | 'JURIDICA';
}

export function SolicitudDetallePage({ tipo }: Props) {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<SolicitudProfesional & Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState(false);
  const [modal, setModal] = useState<'observar' | 'rechazar' | null>(null);

  const fetchData = async () => {
    if (!codigo) return;
    setLoading(true);
    try {
      const data =
        tipo === 'NATURAL'
          ? await profesionalesService.obtenerNatural(codigo)
          : await profesionalesService.obtenerJuridica(codigo);
      setSolicitud(data as unknown as SolicitudProfesional & Record<string, unknown>);
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
      await profesionalesService.aprobar(codigo);
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
      await profesionalesService.emitirCertificado(codigo);
      toast.success('Certificado emitido');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al emitir';
      toast.error(msg);
    } finally {
      setAccionLoading(false);
    }
  };

  // ===== Revisión individual por documento (genérica NATURAL + JURIDICA) =====
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

  const handleRechazarDoc = async (id: number) => {
    const motivo = window.prompt(
      'Motivo del rechazo (mínimo 10 caracteres):',
    );
    if (motivo === null) return;
    if (motivo.trim().length < 10) {
      toast.error('El motivo es obligatorio (mínimo 10 caracteres)');
      return;
    }
    setAccionLoading(true);
    try {
      await documentosService.revisar(id, {
        estado: 'RECHAZADO',
        observacion: motivo.trim(),
      });
      toast.success('Documento rechazado');
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

  const handleVerDoc = async (id: number) => {
    try {
      const blob = await documentosService.descargar(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo abrir el documento');
    }
  };

  const handleFinalizar = async () => {
    if (!codigo) return;
    setAccionLoading(true);
    try {
      const r = await profesionalesService.finalizarRevision(codigo);
      if (r.todosValidados) {
        toast.success(
          `Revisión finalizada: ${r.validados}/${r.total} validados. Ya puede Aprobar.`,
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

  const handleModalConfirm = async (justificacion: string) => {
    if (!codigo || !modal) return;
    setAccionLoading(true);
    try {
      if (modal === 'observar') {
        await profesionalesService.observar(codigo, justificacion);
        toast.success('Solicitud observada');
      } else {
        await profesionalesService.rechazar(codigo, justificacion);
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
  const certificados = (solicitud as Record<string, unknown>).certificados as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  const certSingle = Array.isArray(certificados) ? certificados[0] : certificados as Record<string, unknown> | undefined;

  const estado = solicitud.estado as string;
  const puedeAccionar = ['EN_REVISION', 'REVISADO', 'ENVIADA'].includes(estado);
  const puedeEmitir = estado === 'APROBADA';

  // ===== Contadores y gating (idéntico para NATURAL y JURIDICA) =====
  const docs = (documentos ?? []) as Array<Record<string, unknown>>;
  const totalDocs = docs.length;
  const validados = docs.filter((d) => String(d.estado) === 'VALIDADO').length;
  const pendientes = docs.filter((d) => String(d.estado) === 'PENDIENTE').length;
  const rechazados = docs.filter((d) => String(d.estado) === 'RECHAZADO').length;
  const enRevision = ['EN_REVISION', 'ENVIADA'].includes(estado);
  const todosRevisados = totalDocs > 0 && pendientes === 0;
  const todosValidados = totalDocs > 0 && validados === totalDocs;
  // Aprobar SOLO después de finalizar (REVISADO) y con todos OK
  const puedeAprobar = estado === 'REVISADO' && todosValidados && !accionLoading;
  const puedeFinalizar = enRevision && todosRevisados && !accionLoading;
  const puedeRevisarDocs = enRevision && !accionLoading;

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Profesionales', tipo === 'NATURAL' ? 'Natural' : 'Jurídica', codigo || '']}
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
          <h3 className={styles.cardTitle}>Datos del Trámite</h3>
          <div className={styles.fieldList}>
            {tipo === 'NATURAL' ? (
              <>
                <div><strong>Profesión:</strong> {(datos.profesion as string) || '-'}</div>
                <div><strong>Matrícula:</strong> {(datos.matricula as string) || '-'}</div>
                <div><strong>Especialidad:</strong> {(datos.especialidad as string) || '-'}</div>
                <div><strong>Años experiencia:</strong> {String(datos.aniosExperiencia ?? '-')}</div>
                <div><strong>Institución título:</strong> {(datos.institucionTitulo as string) || '-'}</div>
              </>
            ) : (
              <>
                <div><strong>Tipo empresa:</strong> {(datos.tipoEmpresa as string) || '-'}</div>
                <div><strong>Actividad:</strong> {(datos.actividadEconomica as string) || '-'}</div>
                <div><strong>N° profesionales:</strong> {String(datos.numeroProfesionales ?? '-')}</div>
                <div><strong>Dirección comercial:</strong> {(datos.direccionComercial as string) || '-'}</div>
              </>
            )}
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
                const puedeRevisar = puedeRevisarDocs && est === 'PENDIENTE';
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
                      {dd.observaciones ? (
                        <span className={styles.docMotivo}>
                          {String(dd.observaciones)}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.docActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerDoc(id)}
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
                      {puedeRevisar && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleValidarDoc(id)}
                            disabled={accionLoading}
                          >
                            Validar
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRechazarDoc(id)}
                            disabled={accionLoading}
                          >
                            Rechazar
                          </Button>
                        </>
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
                  : 'Solo tras Finalizar revisión con todos los documentos VALIDADOS (estado REVISADO)'
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
    </div>
  );
}
