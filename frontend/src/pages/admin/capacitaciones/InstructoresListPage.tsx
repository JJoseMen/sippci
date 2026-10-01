import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Table, Badge, Button, Input, Select, Spinner, Pagination } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { instructoresService } from '@/services/instructores.service';
import { useAuthStore } from '@/stores/auth.store';
import { mensajeError } from '@/lib/error';
import type { RolInterno } from '@/config/menu.config';
import type { Instructor } from '@/types/capacitacion.types';
import { InstructorFormModal } from './components/InstructorFormModal';
import { ConfirmarAccionModal } from './components/ConfirmarAccionModal';
import styles from './InstructoresListPage.module.scss';

const ACTIVO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

export function InstructoresListPage() {
  const user = useAuthStore((s) => s.user);
  const esGestor = ((user?.rol || user?.tipo || 'ADMIN') as RolInterno) === 'GESTOR_CAPACITACIONES';

  const [items, setItems] = useState<Instructor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activo, setActivo] = useState('');

  const [modalForm, setModalForm] = useState(false);
  const [instructorEditando, setInstructorEditando] = useState<Instructor | null>(null);
  const [desactivando, setDesactivando] = useState<Instructor | null>(null);
  const [accionCargando, setAccionCargando] = useState(false);

  const fetchInstructores = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await instructoresService.listar({
          page: p,
          limit,
          ...(search ? { search } : {}),
          ...(activo ? { activo: activo === 'true' } : {}),
        });
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setItems([]);
        setTotal(0);
        toast.error(mensajeError(err, 'No se pudieron cargar los instructores'));
      } finally {
        setLoading(false);
      }
    },
    [limit, search, activo],
  );

  useEffect(() => {
    fetchInstructores(1);
  }, [fetchInstructores]);

  const handleBuscar = () => setSearch(searchInput.trim());

  const handleLimpiar = () => {
    setSearchInput('');
    setSearch('');
    setActivo('');
  };

  const guardar = async (fn: () => Promise<unknown>, etiqueta: string) => {
    setAccionCargando(true);
    try {
      await fn();
      toast.success(etiqueta);
      fetchInstructores(page);
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo completar la acción'));
      throw err;
    } finally {
      setAccionCargando(false);
      setDesactivando(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const cols: ColumnDef<Instructor, unknown>[] = useMemo(
    () => [
      { header: 'Nro.', accessorKey: 'id' },
      {
        header: 'Nombre completo',
        cell: ({ row }) => (
          <span className={styles.nombre}>
            {`${row.original.nombre} ${row.original.apellido}`.trim()}
          </span>
        ),
      },
      { header: 'CI', accessorKey: 'ci' },
      {
        header: 'Email',
        cell: ({ row }) => row.original.email || '—',
      },
      {
        header: 'Teléfono',
        cell: ({ row }) => row.original.telefono || '—',
      },
      {
        header: 'Especialidad',
        cell: ({ row }) => row.original.especialidad || '—',
      },
      {
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={row.original.activo ? 'success' : 'neutral'} size="sm">
            {row.original.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        header: 'Acciones',
        cell: ({ row }) => {
          const i = row.original;
          if (!esGestor) return <span className={styles.sinAccion}>—</span>;
          return (
            <div className={styles.acciones}>
              <Button
                size="sm"
                variant="secondary"
                disabled={accionCargando}
                onClick={() => {
                  setInstructorEditando(i);
                  setModalForm(true);
                }}
              >
                Editar
              </Button>
              {i.activo ? (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={accionCargando}
                  onClick={() => setDesactivando(i)}
                >
                  Desactivar
                </Button>
              ) : (
                <span className={styles.sinAccion}>Inactivo</span>
              )}
            </div>
          );
        },
      },
    ],
    [esGestor, accionCargando],
  );

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Capacitaciones', 'Instructores']}
        titulo="Instructores"
        subtitulo="Personal asignado para dictar cursos de capacitación"
      />

      <div className={styles.header}>
        <div />
        {esGestor && (
          <Button
            size="sm"
            onClick={() => {
              setInstructorEditando(null);
              setModalForm(true);
            }}
          >
            Nuevo instructor
          </Button>
        )}
      </div>

      <div className={styles.filters}>
        <Input
          placeholder="Buscar por nombre, apellido o CI..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
        />
        <Select
          value={activo}
          onChange={(e) => setActivo(e.target.value)}
          options={ACTIVO_OPTIONS}
        />
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
          title="No hay instructores"
          description="No se encontraron instructores para estos filtros"
          {...(esGestor
            ? {
                actionLabel: 'Crear instructor',
                onAction: () => {
                  setInstructorEditando(null);
                  setModalForm(true);
                },
              }
            : {})}
        />
      ) : (
        <>
          <Table columns={cols} data={items} emptyMessage="Sin instructores" />
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Página {page} de {totalPages} • {total} registros
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={fetchInstructores}
            />
          </div>
        </>
      )}

      <InstructorFormModal
        isOpen={modalForm}
        instructor={instructorEditando}
        onClose={() => setModalForm(false)}
        onGuardar={async (data) => {
          if (instructorEditando) {
            await guardar(
              () => instructoresService.actualizar(instructorEditando.id, data),
              'Instructor actualizado',
            );
          } else {
            await guardar(() => instructoresService.crear(data), 'Instructor creado');
          }
          setModalForm(false);
        }}
      />

      <ConfirmarAccionModal
        isOpen={Boolean(desactivando)}
        titulo="Desactivar instructor"
        mensaje={`¿Confirma desactivar a ${desactivando?.nombre ?? ''} ${desactivando?.apellido ?? ''} (CI ${desactivando?.ci ?? ''})? Dejará de estar disponible para nuevas programaciones.`}
        etiquetaConfirmar="Sí, desactivar"
        confirmarCargando={accionCargando}
        onClose={() => setDesactivando(null)}
        onConfirmar={async () => {
          if (!desactivando) return;
          await guardar(
            () => instructoresService.desactivar(desactivando.id),
            'Instructor desactivado',
          );
        }}
      />
    </div>
  );
}
