import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Badge, Spinner, Card } from '@/components/ui';
import { solicitudesService } from '@/services/solicitudes.service';
import { documentosService } from '@/services/documentos.service';
import type { SolicitudWithRelations } from '@/types/solicitud.types';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { descargarBlob } from '@/lib/download';
import styles from './SolicitudDetallePage.module.scss';

function badgeVariant(estado: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (['APROBADA', 'CERTIFICADO_EMITIDO', 'RENOVADO'].includes(estado)) return 'success';
  if (['RECHAZADA', 'ANULADA', 'VENCIDO'].includes(estado)) return 'danger';
  if (['BORRADOR', 'OBSERVADA'].includes(estado)) return 'warning';
  return 'info';
}

function titularInfo(sol: SolicitudWithRelations) {
  const d = (sol.datosJson ?? {}) as Record<string, string>;
  const esJuridica = (d.tipoPersona ?? sol.subtipoTramite) === 'JURIDICA';
  return {
    nombre: d.nombrerz || d.nombreCompleto || d.legal || sol.usuario?.nombre || '-',
    doc: esJuridica ? d.nit || '-' : d.ci || d.ciprofesional || '-',
    email: d.email || '-',
    telefono: d.telefono || '-',
  };
}

export function SolicitudDetallePage() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    data: sol,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['solicitud', codigo],
    queryFn: () => solicitudesService.findOne(codigo!),
    enabled: !!codigo,
  });

  const enviar = useMutation({
    mutationFn: () => solicitudesService.enviar(codigo!),
    onSuccess: (s) => {
      toast.success(`Solicitud ${s.codigoFormulario} enviada`);
      qc.invalidateQueries({ queryKey: ['solicitud', codigo] });
    },
    onError: () => toast.error('No se pudo enviar la solicitud'),
  });

  const descargar = async (id: number, nombre: string) => {
    const blob = await documentosService.descargar(id);
    descargarBlob(blob, nombre);
  };

  if (isLoading) return <Spinner size="md" />;
  if (isError || !sol) return <p className={styles['empty']}>No encontrada: {codigo}</p>;

  const t = titularInfo(sol);
  const decla = sol.declaracionesJuradas;
  const cert = sol.certificados?.[0];
  const puedeEnviar = sol.estado === 'BORRADOR';
  const puedeRenovar = ['CERTIFICADO_EMITIDO', 'VENCIDO'].includes(sol.estado);

  return (
    <div className={styles['page']}>
      <div className={styles['head']}>
        <div>
          <span className={styles['code']}>{sol.codigoFormulario}</span>
          <Badge variant={badgeVariant(sol.estado)} size="md">
            {sol.estado}
          </Badge>
        </div>
        <div className={styles['acciones']}>
          <Button variant="ghost" onClick={() => navigate('/mis-solicitudes')}>
            Volver
          </Button>
          {puedeEnviar && (
            <Button variant="primary" loading={enviar.isPending} onClick={() => enviar.mutate()}>
              Enviar
            </Button>
          )}
          {puedeRenovar && (
            <Button
              variant="secondary"
              onClick={() => toast.info('La renovacion se habilitara en una proxima fase')}
            >
              Renovar
            </Button>
          )}
        </div>
      </div>

      <Card title="Datos de la solicitud">
        <div className={styles['datos']}>
          <div>
            <span>Tipo</span>
            <strong>{sol.tipoTramite}</strong>
          </div>
          <div>
            <span>Subtipo</span>
            <strong>{sol.subtipoTramite ?? '-'}</strong>
          </div>
          <div>
            <span>Creada</span>
            <strong>{formatDateTime(sol.createdAt)}</strong>
          </div>
          <div>
            <span>Presentada</span>
            <strong>{sol.fechaAprobacion ? formatDate(sol.fechaAprobacion) : '-'}</strong>
          </div>
          <div>
            <span>Vencimiento</span>
            <strong>{sol.fechaVigencia ? formatDate(sol.fechaVigencia) : '-'}</strong>
          </div>
          <div>
            <span>Titular</span>
            <strong>{t.nombre}</strong>
          </div>
          <div>
            <span>CI/NIT</span>
            <strong>{t.doc}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{t.email}</strong>
          </div>
          <div>
            <span>Telefono</span>
            <strong>{t.telefono}</strong>
          </div>
        </div>
      </Card>

      <Card title="Documentos">
        {sol.documentos && sol.documentos.length > 0 ? (
          <table className={styles['table']}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Archivo</th>
                <th>Estado</th>
                <th>Subida</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sol.documentos.map((d) => (
                <tr key={d.id}>
                  <td>{d.tipo}</td>
                  <td>{d.nombreOriginal}</td>
                  <td>
                    <Badge variant={badgeVariant(d.estado)} size="sm">
                      {d.estado}
                    </Badge>
                  </td>
                  <td>{formatDate(d.createdAt)}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => descargar(d.id, d.nombreOriginal)}
                    >
                      Descargar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles['empty']}>Sin documentos</p>
        )}
      </Card>

      <Card title="Pagos">
        {sol.pagos && sol.pagos.length > 0 ? (
          <table className={styles['table']}>
            <thead>
              <tr>
                <th>N. Operacion</th>
                <th>Monto</th>
                <th>Banco</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sol.pagos.map((p) => (
                <tr key={p.id}>
                  <td>{p.numeroOperacion}</td>
                  <td>{formatMoney(Number(p.monto))}</td>
                  <td>{p.banco}</td>
                  <td>{formatDate(p.fechaDeposito)}</td>
                  <td>
                    <Badge variant={badgeVariant(p.estado)} size="sm">
                      {p.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles['empty']}>Sin pagos</p>
        )}
      </Card>

      {sol.tipoTramite === 'CAPACITACION' && sol.participantesCapacitacion && (
        <Card title="Participantes de la capacitacion">
          {sol.participantesCapacitacion.length > 0 ? (
            <table className={styles['table']}>
              <thead>
                <tr>
                  <th>Subcodigo</th>
                  <th>Participante</th>
                  <th>Carnet</th>
                  <th>Cursos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sol.participantesCapacitacion.map((p) => (
                  <tr key={p.id}>
                    <td>{p.subCodigo}</td>
                    <td>
                      {p.nombreCompleto}
                      {p.esRepresentante && <em style={{ marginLeft: 6 }}>(representante)</em>}
                    </td>
                    <td>
                      {p.carnet} {p.expedido}
                    </td>
                    <td>{p.relaciones.map((r) => r.curso.nombre).join(', ') || '-'}</td>
                    <td>
                      <Badge variant={badgeVariant(p.estado)} size="sm">
                        {p.estado}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles['empty']}>Sin participantes registrados</p>
          )}
        </Card>
      )}

      {decla && (
        <Card title="Declaracion jurada">
          <div className={styles['datos']}>
            <div>
              <span>Codigo</span>
              <strong>{decla.codigoDeclaracion}</strong>
            </div>
            <div>
              <span>Estado</span>
              <strong>{decla.estado}</strong>
            </div>
            <div>
              <span>Firmante</span>
              <strong>
                {decla.firmadoPor} (CI/NIT {decla.ciFirmante})
              </strong>
            </div>
            <div>
              <span>Firmada</span>
              <strong>
                {decla.fechaFirma ? formatDateTime(decla.fechaFirma) : 'Pendiente de firma'}
              </strong>
            </div>
          </div>
          {decla.observacion && <p className={styles['decla']}>Observacion: {decla.observacion}</p>}
        </Card>
      )}

      {cert && (
        <Card title="Certificado">
          <div className={styles['datos']}>
            <div>
              <span>Codigo</span>
              <strong>{cert.codigoCertificado}</strong>
            </div>
            <div>
              <span>Emision</span>
              <strong>{formatDate(cert.fechaEmision)}</strong>
            </div>
            <div>
              <span>Vencimiento</span>
              <strong>{formatDate(cert.fechaVigencia)}</strong>
            </div>
          </div>
        </Card>
      )}

      <Card title="Historial">
        {sol.historial && sol.historial.length > 0 ? (
          <div className={styles['timeline']}>
            {sol.historial.map((h) => (
              <div key={h.id} className={styles['tl-item']}>
                <div className={styles['tl-dot']} />
                <div className={styles['tl-body']}>
                  <div className={styles['tl-head']}>
                    <span>
                      {h.estadoAnterior} <strong>-&gt;</strong> {h.estadoNuevo}
                    </span>
                    <small>{formatDateTime(h.createdAt)}</small>
                  </div>
                  {h.comentario && <p>{h.comentario}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles['empty']}>Sin historial</p>
        )}
      </Card>
    </div>
  );
}
