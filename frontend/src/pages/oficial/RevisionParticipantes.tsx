import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Input, Select } from '@/components/ui';
import { toast } from 'sonner';
import { capacitacionesService, type Participante } from '@/services/capacitaciones.service';
import { descargarBlob } from '@/lib/download';
import styles from './RevisionDocumentosPage.module.scss';

const BADGE: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'neutral'> = {
  PENDIENTE: 'warning',
  FORMULARIO_GENERADO: 'info',
  APROBADO: 'success',
  RECHAZADO: 'danger',
  REPROBADO: 'warning',
  CERTIFICADO_EMITIDO: 'success',
};

export function RevisionParticipantes({ codigo }: { codigo: string }) {
  const [items, setItems] = useState<Participante[]>([]);
  const [observacion, setObservacion] = useState('');
  const [instructor, setInstructor] = useState('');
  const [calificacion, setCalificacion] = useState('APROBADO');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await capacitacionesService.listarParticipantes(codigo);
      setItems(r.items);
    } catch {
      setItems([]);
    }
  }, [codigo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const accion = async (fn: () => Promise<unknown>, okMsg: string) => {
    setCargando(true);
    try {
      await fn();
      toast.success(okMsg);
      await cargar();
      setObservacion('');
      setInstructor('');
      setCalificacion('APROBADO');
    } catch (e) {
      console.log('error accion participante', e);
      toast.error('No se pudo completar la accion');
    } finally {
      setCargando(false);
    }
  };

  const emitir = async () => {
    setCargando(true);
    try {
      const r = await capacitacionesService.emitirCertificados(codigo);
      toast.success(`${r.emitidos} certificado(s) emitidos`);
      await cargar();
    } catch (e) {
      console.log('error emitir', e);
      toast.error('No se pudieron emitir los certificados');
    } finally {
      setCargando(false);
    }
  };

  const descargar = (fn: () => Promise<Blob>, nombre: string) => {
    void fn().then((blob) => descargarBlob(blob, nombre));
  };

  return (
    <div className={styles['page']} style={{ width: '100%', maxWidth: 900 }}>
      <h2 className={styles['subtitle']}>Participantes de la capacitacion</h2>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: '#777' }}>Sin participantes registrados.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
            {items.map((p) => (
              <div key={p.id} className={styles['doc']}>
                <div>
                  <strong>
                    {p.nombreCompleto}
                    {p.esRepresentante && <em style={{ marginLeft: 6 }}>(representante)</em>}
                  </strong>
                  <br />
                  <span className={styles['meta']}>
                    {p.subCodigo} · {p.carnet} {p.expedido} ·{' '}
                    {p.relaciones.map((r) => r.curso.nombre).join(', ') || 'Sin cursos'}
                  </span>
                  <br />
                  <Badge variant={BADGE[p.estado] ?? 'neutral'} size="sm">
                    {p.estado}
                  </Badge>
                  {p.observacion && (
                    <>
                      <br />
                      <span className={styles['meta']}>Observacion: {p.observacion}</span>
                    </>
                  )}
                  {p.instructor && (
                    <>
                      <br />
                      <span className={styles['meta']}>Instructor: {p.instructor}</span>
                    </>
                  )}
                  {p.calificacion && (
                    <>
                      <br />
                      <span className={styles['meta']}>Calificacion: {p.calificacion}</span>
                    </>
                  )}
                  {p.codigoCertificado && (
                    <>
                      <br />
                      <span className={styles['meta']}>Certificado: {p.codigoCertificado}</span>
                    </>
                  )}
                </div>
                <div className={styles['row']} style={{ flexWrap: 'wrap' }}>
                  {p.pdfFormularioRuta && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={cargando}
                      onClick={() =>
                        descargar(
                          () => capacitacionesService.descargarFormulario(p.subCodigo),
                          `${p.subCodigo}_FORM.pdf`,
                        )
                      }
                    >
                      Formulario
                    </Button>
                  )}
                  {p.codigoCertificado && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={cargando}
                      onClick={() =>
                        descargar(
                          () => capacitacionesService.descargarCertificado(p.subCodigo),
                          `${p.codigoCertificado}.pdf`,
                        )
                      }
                    >
                      Certificado
                    </Button>
                  )}
                  {p.estado !== 'CERTIFICADO_EMITIDO' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={cargando}
                        onClick={() =>
                          accion(
                            () =>
                              capacitacionesService.aprobar(
                                p.subCodigo,
                                instructor || undefined,
                                calificacion,
                              ),
                            'Aprobado',
                          )
                        }
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={cargando}
                        onClick={() =>
                          accion(
                            () =>
                              capacitacionesService.rechazar(p.subCodigo, observacion || undefined),
                            'Rechazado',
                          )
                        }
                      >
                        Rechazar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={cargando}
                        onClick={() =>
                          accion(
                            () =>
                              capacitacionesService.reprobar(
                                p.subCodigo,
                                observacion || undefined,
                                instructor || undefined,
                                calificacion,
                              ),
                            'Reprobado',
                          )
                        }
                      >
                        Reprobar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <Input
              label="Instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
            <Select
              label="Calificacion"
              value={calificacion}
              onChange={(e) => setCalificacion(e.target.value)}
              options={[
                { value: 'APROBADO', label: 'APROBADO' },
                { value: 'REPROBADO', label: 'REPROBADO' },
              ]}
            />
          </div>
          <Input
            label="Observacion"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
          <div className={styles['row']}>
            <Button
              variant="primary"
              size="sm"
              loading={cargando}
              onClick={() =>
                accion(() => capacitacionesService.aprobarTodos(codigo), 'Todos aprobados')
              }
            >
              Aprobar todos
            </Button>
            <Button variant="secondary" size="sm" loading={cargando} onClick={emitir}>
              Emitir certificados (aprobados)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
