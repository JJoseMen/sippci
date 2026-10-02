import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { SectionTitle } from '@/components/admin/SectionTitle';
import {
  Table,
  Badge,
  Button,
  Input,
  Spinner,
  Pagination,
  Tabs,
  Card,
} from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { programacionesService } from '@/services/programaciones.service';
import { certificadosCapacitacionService } from '@/services/certificados-capacitacion.service';
import { capacitacionesService } from '@/services/capacitaciones.service';
import { instructoresService } from '@/services/instructores.service';
import { useAuthStore } from '@/stores/auth.store';
import { mensajeError } from '@/lib/error';
import { formatDate, formatDateTime } from '@/lib/format';
import type { RolInterno } from '@/config/menu.config';
import type {
  ActualizarEstadoParticipanteDto,
  Curso,
  EstadoParticipante,
  Instructor,
  InscripcionParticipante,
  Programacion,
} from '@/types/capacitacion.types';
import { ProgramacionFormModal } from './components/ProgramacionFormModal';
import { ReprogramarModal } from './components/ReprogramarModal';
import { InscribirParticipanteModal } from './components/InscribirParticipanteModal';
import { EditarParticipanteModal } from './components/EditarParticipanteModal';
import { ConfirmarAccionModal } from './components/ConfirmarAccionModal';
import { JustificacionModal } from './components/JustificacionModal';
import {
  ETIQUETA_ESTADO,
  VARIANTE_ESTADO,
  VARIANTE_PARTICIPANTE,
  puedeCancelar,
  puedeEditar,
  puedeFinalizar,
  puedeGestionarParticipantes,
  puedeIniciar,
  puedeReprogramar,
  puedeResolverResultados,
} from './programacion.utils';
import styles from './ProgramacionDetallePage.module.scss';

const FILTROS_RESULTADO: { value: EstadoParticipante | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'APROBADO', label: 'Aprobados' },
  { value: 'REPROBADO', label: 'Reprobados' },
  { value: 'INSCRITO', label: 'Pendientes' },
];

function Dato({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div className={styles.dato}>
      <span className={styles.datoLabel}>{label}</span>
      <span className={styles.datoValor}>{valor}</span>
    </div>
  );
}

function DatosGenerales({ programacion }: { programacion: Programacion }) {
  const inscritos = programacion._count?.participantes ?? 0;
  return (
    <Card title="Información general">
      <div className={styles.datos}>
        <Dato label="Nro. de programación" valor={`#${programacion.id}`} />
        <Dato
          label="Estado"
          valor={
            <Badge variant={VARIANTE_ESTADO[programacion.estado]} size="sm">
              {ETIQUETA_ESTADO[programacion.estado]}
            </Badge>
          }
        />
        <Dato label="Curso" valor={programacion.curso?.nombre ?? programacion.cursoId} />
        <Dato label="Modalidad" valor={programacion.curso?.modalidad ?? '—'} />
        <Dato
          label="Duración"
          valor={programacion.curso?.duracionHoras ? `${programacion.curso.duracionHoras} h` : '—'}
        />
        <Dato
          label="Instructor"
          valor={
            programacion.instructor
              ? `${programacion.instructor.nombre} ${programacion.instructor.apellido}`.trim()
              : 'Sin asignar'
          }
        />
        <Dato label="Inicio" valor={formatDateTime(programacion.fechaInicio)} />
        <Dato
          label="Fin"
          valor={programacion.fechaFin ? formatDateTime(programacion.fechaFin) : '—'}
        />
        <Dato label="Lugar" valor={programacion.lugar || '—'} />
        <Dato label="Cupo" valor={programacion.cupo ?? 'Sin límite'} />
        <Dato
          label="Inscritos"
          valor={`${inscritos}${programacion.cupo != null ? ` / ${programacion.cupo}` : ''}`}
        />
        <Dato label="Creada" valor={formatDate(programacion.createdAt)} />
        <div className={`${styles.dato} ${styles.campoAncho}`}>
          <span className={styles.datoLabel}>Observaciones</span>
          <span className={styles.datoValor}>{programacion.observaciones || '—'}</span>
        </div>
      </div>
    </Card>
  );
}

interface ParticipantesProps {
  programacion: Programacion;
  esGestor: boolean;
  onCambio: () => void;
}

interface Resolucion {
  inscripcion: InscripcionParticipante;
  nuevoEstado: EstadoParticipante;
  justificacion?: string;
}

function ParticipantesSection({ programacion, esGestor, onCambio }: ParticipantesProps) {
  const gestionable = puedeGestionarParticipantes(programacion.estado);
  const resoluble = puedeResolverResultados(programacion.estado);

  const [items, setItems] = useState<InscripcionParticipante[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [resultado, setResultado] = useState('');

  const [conteos, setConteos] = useState({ aprobados: 0, reprobados: 0, pendientes: 0 });
  const [pendientesCertificado, setPendientesCertificado] = useState(0);

  const [modalInscribir, setModalInscribir] = useState(false);
  const [modalLote, setModalLote] = useState(false);
  const [editando, setEditando] = useState<InscripcionParticipante | null>(null);
  const [desinscribiendo, setDesinscribiendo] = useState<InscripcionParticipante | null>(null);
  const [justificando, setJustificando] = useState<Resolucion | null>(null);
  const [resolviendo, setResolviendo] = useState<Resolucion | null>(null);
  const [accionCargando, setAccionCargando] = useState(false);

  const fetchConteos = useCallback(async () => {
    try {
      const res = await programacionesService.listarParticipantes(programacion.id, {
        page: 1,
        limit: 100,
      });
      let aprobados = 0;
      let reprobados = 0;
      let pendientes = 0;
      let sinCertificado = 0;
      for (const item of res.items) {
        const est = item.participante?.estado;
        if (est === 'APROBADO') {
          aprobados += 1;
          if (item.certificadoId == null) sinCertificado += 1;
        } else if (est === 'REPROBADO') reprobados += 1;
        else pendientes += 1;
      }
      setConteos({ aprobados, reprobados, pendientes });
      setPendientesCertificado(sinCertificado);
    } catch {
      setConteos({ aprobados: 0, reprobados: 0, pendientes: 0 });
      setPendientesCertificado(0);
    }
  }, [programacion.id]);

  const fetchParticipantes = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await programacionesService.listarParticipantes(programacion.id, {
          page: p,
          limit,
          ...(search ? { search } : {}),
          ...(resultado ? { estado: resultado as EstadoParticipante } : {}),
        });
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setItems([]);
        setTotal(0);
        toast.error(mensajeError(err, 'No se pudieron cargar los participantes'));
      } finally {
        setLoading(false);
      }
    },
    [programacion.id, limit, search, resultado],
  );

  useEffect(() => {
    fetchParticipantes(1);
  }, [fetchParticipantes]);

  useEffect(() => {
    fetchConteos();
  }, [fetchConteos]);

  const ejecutar = async (fn: () => Promise<unknown>, etiqueta: string) => {
    setAccionCargando(true);
    try {
      await fn();
      toast.success(etiqueta);
      await Promise.all([fetchParticipantes(page), fetchConteos()]);
      onCambio();
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo completar la acción'));
      throw err;
    } finally {
      setAccionCargando(false);
      setDesinscribiendo(null);
      setResolviendo(null);
      setJustificando(null);
    }
  };

  const emitirCertificado = async (inscripcion: InscripcionParticipante) => {
    setAccionCargando(true);
    try {
      const cert = await certificadosCapacitacionService.emitir({
        programacionId: programacion.id,
        participanteId: inscripcion.participanteId,
      });
      toast.success(`Certificado emitido: ${cert.codigo}`);
      await Promise.all([fetchParticipantes(page), fetchConteos()]);
      onCambio();
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo emitir el certificado'));
    } finally {
      setAccionCargando(false);
    }
  };

  const emitirLote = async () => {
    setAccionCargando(true);
    try {
      const res = await certificadosCapacitacionService.emitirLote({
        programacionId: programacion.id,
      });
      if (res.emitidos > 0) {
        toast.success(`Certificados emitidos: ${res.emitidos}`);
      } else {
        toast.info('No había aprobados sin certificado');
      }
      if (res.errores.length > 0) {
        toast.error(`No se pudo emitir en ${res.errores.length} participante(s)`);
      }
      await Promise.all([fetchParticipantes(page), fetchConteos()]);
      onCambio();
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudieron emitir los certificados'));
    } finally {
      setAccionCargando(false);
      setModalLote(false);
    }
  };

  const solicitarResolucion = (
    inscripcion: InscripcionParticipante,
    nuevoEstado: EstadoParticipante,
  ) => {
    const estadoPrevia = inscripcion.participante?.estado;
    const base: Resolucion = { inscripcion, nuevoEstado };
    if (estadoPrevia && estadoPrevia !== 'INSCRITO') {
      setJustificando(base);
      return;
    }
    setResolviendo(base);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const cols: ColumnDef<InscripcionParticipante, unknown>[] = useMemo(
    () => [
      {
        header: 'Participante',
        cell: ({ row }) => {
          const p = row.original.participante;
          return p ? (
            <span>
              <span className={styles.nombreParticipante}>{p.nombre}</span>
              <span className={styles.ciParticipante}>CI {p.ci}</span>
            </span>
          ) : (
            `#${row.original.participanteId}`
          );
        },
      },
      {
        header: 'Estado',
        cell: ({ row }) => {
          const est = row.original.participante?.estado;
          if (!est) return <span>—</span>;
          return (
            <Badge variant={VARIANTE_PARTICIPANTE[est]} size="sm">
              {est}
            </Badge>
          );
        },
      },
      {
        header: 'Resultado',
        cell: ({ row }) =>
          row.original.aprobado === null ? (
            <span className={styles.sino}>—</span>
          ) : (
            <Badge variant={row.original.aprobado ? 'success' : 'danger'} size="sm">
              {row.original.aprobado ? 'Aprobado' : 'Reprobado'}
            </Badge>
          ),
      },
      {
        header: 'Puntaje',
        cell: ({ row }) => (row.original.puntaje === null ? '—' : `${row.original.puntaje}`),
      },
      {
        header: 'Observaciones',
        cell: ({ row }) => row.original.observaciones || '—',
      },
      {
        header: 'Acciones',
        cell: ({ row }) => (
          <div className={styles.accionesCelda}>
            {esGestor && resoluble && row.original.certificadoId == null && (
              <Button
                size="sm"
                variant="primary"
                disabled={accionCargando}
                onClick={() => solicitarResolucion(row.original, 'APROBADO')}
              >
                Aprobar
              </Button>
            )}
            {esGestor && resoluble && row.original.certificadoId == null && (
              <Button
                size="sm"
                variant="danger"
                disabled={accionCargando}
                onClick={() => solicitarResolucion(row.original, 'REPROBADO')}
              >
                Reprobar
              </Button>
            )}
            {esGestor &&
              resoluble &&
              row.original.participante?.estado === 'APROBADO' &&
              row.original.certificadoId == null && (
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid="emitir-certificado"
                  disabled={accionCargando}
                  onClick={() => emitirCertificado(row.original)}
                >
                  Emitir certificado
                </Button>
              )}
            {esGestor && gestionable && (
              <Button
                size="sm"
                variant="secondary"
                disabled={accionCargando}
                onClick={() => setEditando(row.original)}
              >
                Editar
              </Button>
            )}
            {esGestor && gestionable && (
              <Button
                size="sm"
                variant="danger"
                disabled={accionCargando}
                onClick={() => setDesinscribiendo(row.original)}
              >
                Desinscribir
              </Button>
            )}
          </div>
        ),
      },
    ],
    [esGestor, gestionable, resoluble, accionCargando, emitirCertificado],
  );

  const inscritos = programacion._count?.participantes ?? 0;

  return (
    <Card title="Participantes inscritos">
      {esGestor && (
        <div className={styles.topBar} style={{ marginBottom: '1rem' }}>
          {gestionable ? (
            <span className={styles.aviso}>
              {inscritos}
              {programacion.cupo != null ? ` / ${programacion.cupo}` : ''} inscritos
            </span>
          ) : (
            <span className={styles.aviso}>
              Inscripciones cerradas: la programación está en estado{' '}
              {ETIQUETA_ESTADO[programacion.estado]}.
            </span>
          )}
          <Button size="sm" disabled={!gestionable} onClick={() => setModalInscribir(true)}>
            Inscribir participante
          </Button>
          {esGestor && resoluble && pendientesCertificado > 0 && (
            <Button
              size="sm"
              variant="primary"
              data-testid="emitir-lote"
              disabled={accionCargando}
              onClick={() => setModalLote(true)}
            >
              Emitir a todos los aprobados
            </Button>
          )}
        </div>
      )}

      <div className={styles.conteos} data-testid="conteos-resultados">
        {conteos.aprobados} aprobados / {conteos.reprobados} reprobados /{' '}
        {conteos.pendientes} pendientes
      </div>

      <div className={styles.filters}>
        <Input
          placeholder="Buscar por nombre o CI..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput.trim())}
        />
        <div className={styles.filtrosResultado}>
          {FILTROS_RESULTADO.map((opcion) => (
            <Button
              key={opcion.value || 'todos'}
              size="sm"
              variant={resultado === opcion.value ? 'primary' : 'secondary'}
              onClick={() => setResultado(opcion.value)}
            >
              {opcion.label}
            </Button>
          ))}
        </div>
        <div className={styles.filterActions}>
          <Button variant="secondary" size="sm" onClick={() => setSearch(searchInput.trim())}>
            Buscar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setResultado('');
            }}
          >
            Limpiar
          </Button>
        </div>
      </div>

      {loading ? (
        <Spinner size="md" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Sin participantes inscritos"
          description="Todavía no hay inscripciones en esta programación"
          {...(esGestor && gestionable
            ? { actionLabel: 'Inscribir participante', onAction: () => setModalInscribir(true) }
            : {})}
        />
      ) : (
        <>
          <Table columns={cols} data={items} emptyMessage="Sin participantes" />
          <div className={styles.pagination} style={{ marginTop: '1rem' }}>
            <span className={styles.pageInfo}>
              Página {page} de {totalPages} • {total} registros
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={fetchParticipantes}
            />
          </div>
        </>
      )}

      <InscribirParticipanteModal
        isOpen={modalInscribir}
        programacion={programacion}
        onClose={() => setModalInscribir(false)}
        onInscribir={async (participanteId) => {
          await ejecutar(
            () => programacionesService.inscribir(programacion.id, { participanteId }),
            'Participante inscrito',
          );
          setModalInscribir(false);
        }}
      />

      <EditarParticipanteModal
        isOpen={Boolean(editando)}
        inscripcion={editando}
        onClose={() => setEditando(null)}
        onGuardar={async (data: ActualizarEstadoParticipanteDto) => {
          if (!editando) return;
          await ejecutar(
            () =>
              programacionesService.actualizarParticipante(
                programacion.id,
                editando.participanteId,
                data,
              ),
            'Participante actualizado',
          );
          setEditando(null);
        }}
      />

      <ConfirmarAccionModal
        isOpen={Boolean(desinscribiendo)}
        titulo="Desinscribir participante"
        mensaje={`¿Confirma desinscribir a ${
          desinscribiendo?.participante?.nombre ?? `#${desinscribiendo?.participanteId}`
        } de esta programación?`}
        etiquetaConfirmar="Sí, desinscribir"
        confirmarCargando={accionCargando}
        onClose={() => setDesinscribiendo(null)}
        onConfirmar={async () => {
          if (!desinscribiendo) return;
          await ejecutar(
            () =>
              programacionesService.desinscribir(programacion.id, desinscribiendo.participanteId),
            'Participante desinscrito',
          );
        }}
      />

      <ConfirmarAccionModal
        isOpen={modalLote}
        titulo="Emitir certificados en lote"
        mensaje={`¿Emitir certificado a los ${pendientesCertificado} participante(s) aprobado(s) que aún no tienen certificado?`}
        etiquetaConfirmar="Sí, emitir"
        confirmarCargando={accionCargando}
        onClose={() => setModalLote(false)}
        onConfirmar={emitirLote}
      />

      <JustificacionModal
        isOpen={Boolean(justificando)}
        titulo={
          justificando?.nuevoEstado === 'APROBADO'
            ? 'Corregir a aprobado'
            : 'Corregir a reprobado'
        }
        mensaje={`Este participante ya tiene resultado. Indique el motivo para cambiarlo a`}
        nombreParticipante={justificando?.inscripcion.participante?.nombre ?? ''}
        onClose={() => setJustificando(null)}
        onConfirmar={async (justificacion) => {
          if (!justificando) return;
          setResolviendo({ ...justificando, justificacion });
          setJustificando(null);
        }}
      />

      <ConfirmarAccionModal
        isOpen={Boolean(resolviendo)}
        titulo={resolviendo?.nuevoEstado === 'APROBADO' ? 'Aprobar participante' : 'Reprobar participante'}
        mensaje={`¿Confirma marcar como ${
          resolviendo?.nuevoEstado === 'APROBADO' ? 'APROBADO' : 'REPROBADO'
        } a ${
          resolviendo?.inscripcion.participante?.nombre ??
          `#${resolviendo?.inscripcion.participanteId}`
        }?`}
        etiquetaConfirmar={
          resolviendo?.nuevoEstado === 'APROBADO' ? 'Sí, aprobar' : 'Sí, reprobar'
        }
        confirmarCargando={accionCargando}
        onClose={() => setResolviendo(null)}
        onConfirmar={async () => {
          if (!resolviendo) return;
          await ejecutar(
            () =>
              programacionesService.actualizarParticipante(
                programacion.id,
                resolviendo.inscripcion.participanteId,
                {
                  estado: resolviendo.nuevoEstado,
                  ...(resolviendo.justificacion
                    ? { justificacion: resolviendo.justificacion }
                    : {}),
                },
              ),
            resolviendo.nuevoEstado === 'APROBADO'
              ? 'Participante aprobado'
              : 'Participante reprobado',
          );
        }}
      />
    </Card>
  );
}

export function ProgramacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const esGestor = ((user?.rol || user?.tipo || 'ADMIN') as RolInterno) === 'GESTOR_CAPACITACIONES';

  const [programacion, setProgramacion] = useState<Programacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [accionCargando, setAccionCargando] = useState(false);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);

  const [modalForm, setModalForm] = useState(false);
  const [modalReprogramar, setModalReprogramar] = useState(false);
  const [modalCancelar, setModalCancelar] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      const [cs, ins] = await Promise.all([
        capacitacionesService.listarCursos().catch(() => [] as Curso[]),
        instructoresService.listar({ limit: 100 }).catch(() => null),
      ]);
      if (!activo) return;
      setCursos(cs);
      setInstructores(ins?.items ?? []);
    })();
    return () => {
      activo = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await programacionesService.obtener(Number(id));
      setProgramacion(data);
    } catch (err) {
      setProgramacion(null);
      toast.error(mensajeError(err, 'No se pudo cargar la programación'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutar = async (fn: () => Promise<unknown>, etiqueta: string) => {
    setAccionCargando(true);
    try {
      await fn();
      toast.success(etiqueta);
      await cargar();
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo completar la acción'));
      throw err;
    } finally {
      setAccionCargando(false);
      setModalCancelar(false);
      setModalReprogramar(false);
    }
  };

  // Solo bloquea la primera carga. Si se desmontara en cada recarga se
  // perdería la pestaña activa (Tabs guarda su estado interno) y todos los
  // filtros/página de Participantes.
  if (loading && !programacion) return <Spinner size="md" />;

  if (!programacion) {
    return (
      <div className={styles.page}>
        <SectionTitle
          breadcrumb={['Admin', 'Capacitaciones', 'Programaciones', 'Detalle']}
          titulo="Programación no encontrada"
        />
        <EmptyState
          title="No se encontró la programación"
          description="Verifique el identificador e intente nuevamente"
          actionLabel="Volver al listado"
          onAction={() => navigate('/admin/sippci/capacitaciones/programaciones')}
        />
      </div>
    );
  }

  const estado = programacion.estado;
  const inscritos = programacion._count?.participantes ?? 0;

  const tabs = [
    {
      id: 'general',
      label: 'Información general',
      content: <DatosGenerales programacion={programacion} />,
    },
    {
      id: 'participantes',
      label: `Participantes (${inscritos})`,
      content: (
        <ParticipantesSection programacion={programacion} esGestor={esGestor} onCambio={cargar} />
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Capacitaciones', 'Programaciones', `#${programacion.id}`]}
        titulo={`${programacion.curso?.nombre ?? 'Programación'} #${programacion.id}`}
        subtitulo={formatDateTime(programacion.fechaInicio)}
      />

      <div className={styles.topBar}>
        <Link to="/admin/sippci/capacitaciones/programaciones">← Volver al listado</Link>
        <div className={styles.acciones}>
          <Badge variant={VARIANTE_ESTADO[estado]} size="md">
            {ETIQUETA_ESTADO[estado]}
          </Badge>
          {esGestor && puedeEditar(estado) && (
            <Button size="sm" variant="secondary" onClick={() => setModalForm(true)}>
              Editar
            </Button>
          )}
          {esGestor && puedeReprogramar(estado) && (
            <Button size="sm" variant="secondary" onClick={() => setModalReprogramar(true)}>
              Reprogramar
            </Button>
          )}
          {esGestor && puedeIniciar(estado) && (
            <Button
              size="sm"
              loading={accionCargando}
              onClick={() =>
                ejecutar(
                  () => programacionesService.iniciar(programacion.id),
                  'Programación iniciada',
                )
              }
            >
              Iniciar
            </Button>
          )}
          {esGestor && puedeFinalizar(estado) && (
            <Button
              size="sm"
              loading={accionCargando}
              onClick={() =>
                ejecutar(
                  () => programacionesService.finalizar(programacion.id),
                  'Programación finalizada',
                )
              }
            >
              Finalizar
            </Button>
          )}
          {esGestor && puedeCancelar(estado) && (
            <Button size="sm" variant="danger" onClick={() => setModalCancelar(true)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} />

      <ProgramacionFormModal
        isOpen={modalForm}
        programacion={programacion}
        cursos={cursos}
        instructores={instructores}
        onClose={() => setModalForm(false)}
        onGuardar={async (data) => {
          await ejecutar(
            () => programacionesService.actualizar(programacion.id, data),
            'Programación actualizada',
          );
          setModalForm(false);
        }}
      />

      <ReprogramarModal
        isOpen={modalReprogramar}
        programacion={programacion}
        onClose={() => setModalReprogramar(false)}
        onGuardar={async (data) => {
          await ejecutar(
            () => programacionesService.reprogramar(programacion.id, data),
            'Programación reprogramada',
          );
        }}
      />

      <ConfirmarAccionModal
        isOpen={modalCancelar}
        titulo="Cancelar programación"
        mensaje={`¿Confirma cancelar la programación #${programacion.id}? Esta acción no se puede deshacer.`}
        etiquetaConfirmar="Sí, cancelar"
        confirmarCargando={accionCargando}
        onClose={() => setModalCancelar(false)}
        onConfirmar={() =>
          ejecutar(() => programacionesService.cancelar(programacion.id), 'Programación cancelada')
        }
      />
    </div>
  );
}
