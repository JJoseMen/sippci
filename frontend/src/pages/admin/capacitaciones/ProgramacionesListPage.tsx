import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Table, Badge, Button, Input, Select, Spinner, Pagination } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { programacionesService } from '@/services/programaciones.service';
import { capacitacionesService } from '@/services/capacitaciones.service';
import { instructoresService } from '@/services/instructores.service';
import { useAuthStore } from '@/stores/auth.store';
import { mensajeError } from '@/lib/error';
import { formatDateTime } from '@/lib/format';
import type { RolInterno } from '@/config/menu.config';
import type {
  Curso,
  EstadoProgramacion,
  Instructor,
  Programacion,
} from '@/types/capacitacion.types';
import { ProgramacionFormModal } from './components/ProgramacionFormModal';
import { ReprogramarModal } from './components/ReprogramarModal';
import { ConfirmarAccionModal } from './components/ConfirmarAccionModal';
import {
  ESTADOS_PROGRAMACION,
  ETIQUETA_ESTADO,
  VARIANTE_ESTADO,
  formatoCupo,
  puedeCancelar,
  puedeEditar,
  puedeFinalizar,
  puedeIniciar,
  puedeReprogramar,
} from './programacion.utils';
import styles from './ProgramacionesListPage.module.scss';

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  ...ESTADOS_PROGRAMACION.map((e) => ({ value: e, label: ETIQUETA_ESTADO[e] })),
];

export function ProgramacionesListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const esGestor = ((user?.rol || user?.tipo || 'ADMIN') as RolInterno) === 'GESTOR_CAPACITACIONES';

  const [items, setItems] = useState<Programacion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);

  const [modalForm, setModalForm] = useState(false);
  const [programacionEditando, setProgramacionEditando] = useState<Programacion | null>(null);
  const [reprogramando, setReprogramando] = useState<Programacion | null>(null);
  const [cancelando, setCancelando] = useState<Programacion | null>(null);
  const [accionCargando, setAccionCargando] = useState(false);

  const fetchProgramaciones = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await programacionesService.listar({
          page: p,
          limit,
          ...(search ? { search } : {}),
          ...(estado ? { estado: estado as EstadoProgramacion } : {}),
          ...(cursoId ? { cursoId: Number(cursoId) } : {}),
          ...(instructorId ? { instructorId: Number(instructorId) } : {}),
          ...(desde ? { desde } : {}),
          ...(hasta ? { hasta } : {}),
        });
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setItems([]);
        setTotal(0);
        toast.error(mensajeError(err, 'No se pudieron cargar las programaciones'));
      } finally {
        setLoading(false);
      }
    },
    [limit, search, estado, cursoId, instructorId, desde, hasta],
  );

  useEffect(() => {
    fetchProgramaciones(1);
  }, [fetchProgramaciones]);

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

  const handleBuscar = () => setSearch(searchInput.trim());

  const handleLimpiar = () => {
    setSearchInput('');
    setSearch('');
    setEstado('');
    setCursoId('');
    setInstructorId('');
    setDesde('');
    setHasta('');
  };

  const refrescar = () => fetchProgramaciones(page);

  const ejecutar = async (fn: () => Promise<unknown>, etiqueta: string) => {
    setAccionCargando(true);
    try {
      await fn();
      toast.success(etiqueta);
      refrescar();
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo completar la acción'));
      throw err;
    } finally {
      setAccionCargando(false);
      setCancelando(null);
      setReprogramando(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const cols: ColumnDef<Programacion, unknown>[] = useMemo(
    () => [
      { header: 'Nro.', accessorKey: 'id' },
      {
        header: 'Curso',
        cell: ({ row }) => (
          <span>
            <span className={styles.cursoNombre}>{row.original.curso?.nombre ?? '-'}</span>
            <span className={styles.cursoModalidad}>{row.original.curso?.modalidad ?? ''}</span>
          </span>
        ),
      },
      {
        header: 'Instructor',
        cell: ({ row }) =>
          row.original.instructor
            ? `${row.original.instructor.nombre} ${row.original.instructor.apellido}`.trim()
            : '—',
      },
      {
        header: 'Inicio',
        cell: ({ row }) => formatDateTime(row.original.fechaInicio),
      },
      {
        header: 'Lugar',
        cell: ({ row }) => row.original.lugar || '—',
      },
      {
        header: 'Inscritos',
        cell: ({ row }) => {
          const inscritos = row.original._count?.participantes ?? 0;
          const lleno = row.original.cupo !== null && inscritos >= row.original.cupo;
          return (
            <span className={`${styles.cupoTexto} ${lleno ? styles.cupoLleno : ''}`}>
              {formatoCupo(inscritos, row.original.cupo)}
            </span>
          );
        },
      },
      {
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={VARIANTE_ESTADO[row.original.estado]} size="sm">
            {ETIQUETA_ESTADO[row.original.estado]}
          </Badge>
        ),
      },
      {
        header: 'Acciones',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className={styles.acciones}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/admin/sippci/capacitaciones/programaciones/${p.id}`)}
              >
                Ver
              </Button>
              {esGestor && puedeEditar(p.estado) && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={accionCargando}
                  onClick={() => {
                    setProgramacionEditando(p);
                    setModalForm(true);
                  }}
                >
                  Editar
                </Button>
              )}
              {esGestor && puedeReprogramar(p.estado) && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={accionCargando}
                  onClick={() => setReprogramando(p)}
                >
                  Reprogramar
                </Button>
              )}
              {esGestor && puedeIniciar(p.estado) && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={accionCargando}
                  onClick={() =>
                    ejecutar(() => programacionesService.iniciar(p.id), 'Programación iniciada')
                  }
                >
                  Iniciar
                </Button>
              )}
              {esGestor && puedeFinalizar(p.estado) && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={accionCargando}
                  onClick={() =>
                    ejecutar(() => programacionesService.finalizar(p.id), 'Programación finalizada')
                  }
                >
                  Finalizar
                </Button>
              )}
              {esGestor && puedeCancelar(p.estado) && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={accionCargando}
                  onClick={() => setCancelando(p)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [navigate, esGestor, accionCargando],
  );

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Capacitaciones', 'Programaciones']}
        titulo="Programaciones"
        subtitulo="Cursos programados, fechas, cupos e inscripciones"
      />

      <div className={styles.header}>
        <div />
        {esGestor && (
          <Button
            size="sm"
            onClick={() => {
              setProgramacionEditando(null);
              setModalForm(true);
            }}
          >
            Nueva programación
          </Button>
        )}
      </div>

      <div className={styles.filters}>
        <Input
          placeholder="Buscar por lugar u observaciones..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
        />
        <Select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          options={ESTADO_OPTIONS}
        />
        <Select
          value={cursoId}
          onChange={(e) => setCursoId(e.target.value)}
          options={[
            { value: '', label: 'Todos los cursos' },
            ...cursos.map((c) => ({ value: String(c.id), label: c.nombre })),
          ]}
        />
        <Select
          value={instructorId}
          onChange={(e) => setInstructorId(e.target.value)}
          options={[
            { value: '', label: 'Todos los instructores' },
            ...instructores.map((i) => ({
              value: String(i.id),
              label: `${i.nombre} ${i.apellido}`.trim(),
            })),
          ]}
        />
        <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <div className={styles.filterActions}>
          <Button variant="secondary" size="sm" onClick={handleBuscar}>
            Buscar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLimpiar}>
            Limpiar
          </Button>
        </div>
      </div>

      {loading ? (
        <Spinner size="md" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No hay programaciones"
          description="No se encontraron programaciones para estos filtros"
          {...(esGestor
            ? {
                actionLabel: 'Crear programación',
                onAction: () => {
                  setProgramacionEditando(null);
                  setModalForm(true);
                },
              }
            : {})}
        />
      ) : (
        <>
          <Table columns={cols} data={items} emptyMessage="Sin programaciones" />
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Página {page} de {totalPages} • {total} registros
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={fetchProgramaciones}
            />
          </div>
        </>
      )}

      <ProgramacionFormModal
        isOpen={modalForm}
        programacion={programacionEditando}
        cursos={cursos}
        instructores={instructores}
        onClose={() => setModalForm(false)}
        onGuardar={async (data) => {
          if (programacionEditando) {
            await ejecutar(
              () => programacionesService.actualizar(programacionEditando.id, data),
              'Programación actualizada',
            );
          } else {
            await ejecutar(() => programacionesService.crear(data), 'Programación creada');
          }
          setModalForm(false);
        }}
      />

      <ReprogramarModal
        isOpen={Boolean(reprogramando)}
        programacion={reprogramando}
        onClose={() => setReprogramando(null)}
        onGuardar={async (data) => {
          if (!reprogramando) return;
          await ejecutar(
            () => programacionesService.reprogramar(reprogramando.id, data),
            'Programación reprogramada',
          );
        }}
      />

      <ConfirmarAccionModal
        isOpen={Boolean(cancelando)}
        titulo="Cancelar programación"
        mensaje={`¿Confirma cancelar la programación #${cancelando?.id}? Esta acción no se puede deshacer.`}
        etiquetaConfirmar="Sí, cancelar"
        confirmarCargando={accionCargando}
        onClose={() => setCancelando(null)}
        onConfirmar={async () => {
          if (!cancelando) return;
          await ejecutar(
            () => programacionesService.cancelar(cancelando.id),
            'Programación cancelada',
          );
        }}
      />
    </div>
  );
}
