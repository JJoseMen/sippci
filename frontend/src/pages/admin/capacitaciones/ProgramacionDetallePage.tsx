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
  Select,
  Spinner,
  Pagination,
  Tabs,
  Card,
} from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { programacionesService } from '@/services/programaciones.service';
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
} from './programacion.utils';
import styles from './ProgramacionDetallePage.module.scss';

const OPCIONES_SI_NO = [
  { value: '', label: 'Asistencia: todas' },
  { value: 'true', label: 'Asistió' },
  { value: 'false', label: 'No asistió' },
];

const OPCIONES_APROBADO = [
  { value: '', label: 'Aprobación: todas' },
  { value: 'true', label: 'Aprobados' },
  { value: 'false', label: 'Reprobados' },
];

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos los estados' },
  { value: 'INSCRITO', label: 'Inscrito' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'REPROBADO', label: 'Reprobado' },
  { value: 'ABANDONO', label: 'Abandono' },
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

function ParticipantesSection({ programacion, esGestor, onCambio }: ParticipantesProps) {
  const gestionable = puedeGestionarParticipantes(programacion.estado);

  const [items, setItems] = useState<InscripcionParticipante[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [asistencia, setAsistencia] = useState('');
  const [aprobado, setAprobado] = useState('');

  const [modalInscribir, setModalInscribir] = useState(false);
  const [editando, setEditando] = useState<InscripcionParticipante | null>(null);
  const [desinscribiendo, setDesinscribiendo] = useState<InscripcionParticipante | null>(null);
  const [accionCargando, setAccionCargando] = useState(false);

  const fetchParticipantes = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await programacionesService.listarParticipantes(programacion.id, {
          page: p,
          limit,
          ...(search ? { search } : {}),
          ...(estado ? { estado: estado as EstadoParticipante } : {}),
          ...(asistencia ? { asistencia: asistencia === 'true' } : {}),
          ...(aprobado ? { aprobado: aprobado === 'true' } : {}),
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
    [programacion.id, limit, search, estado, asistencia, aprobado],
  );

  useEffect(() => {
    fetchParticipantes(1);
  }, [fetchParticipantes]);

  const ejecutar = async (fn: () => Promise<unknown>, etiqueta: string) => {
    setAccionCargando(true);
    try {
      await fn();
      toast.success(etiqueta);
      await fetchParticipantes(page);
      onCambio();
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo completar la acción'));
      throw err;
    } finally {
      setAccionCargando(false);
      setDesinscribiendo(null);
    }
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
        header: 'Asistió',
        cell: ({ row }) =>
          row.original.asistencia === null ? (
            <span className={styles.sino}>—</span>
          ) : (
            <span className={`${styles.sino} ${row.original.asistencia ? styles.si : styles.no}`}>
              {row.original.asistencia ? 'Sí' : 'No'}
            </span>
          ),
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
    [esGestor, gestionable, accionCargando],
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
        </div>
      )}

      <div className={styles.filters}>
        <Input
          placeholder="Buscar por nombre o CI..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput.trim())}
        />
        <Select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          options={OPCIONES_ESTADO}
        />
        <Select
          value={asistencia}
          onChange={(e) => setAsistencia(e.target.value)}
          options={OPCIONES_SI_NO}
        />
        <Select
          value={aprobado}
          onChange={(e) => setAprobado(e.target.value)}
          options={OPCIONES_APROBADO}
        />
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
              setEstado('');
              setAsistencia('');
              setAprobado('');
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

  if (loading) return <Spinner size="md" />;

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
