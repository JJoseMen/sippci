import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Table, Badge, Button, Input, Select, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { certificadosCapacitacionService } from '@/services/certificados-capacitacion.service';
import { descargarBlob } from '@/lib/download';
import { mensajeError } from '@/lib/error';
import { formatDate } from '@/lib/format';
import type { CertificadoCapacitacion, EstadoVigencia } from '@/types/capacitacion.types';
import styles from './CertificadosEmitidosPage.module.scss';

function varianteVigencia(v: EstadoVigencia | undefined) {
  switch (v) {
    case 'VIGENTE':
      return 'success' as const;
    case 'POR_VENCER':
      return 'warning' as const;
    case 'VENCIDO':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

const opcionesEstado = [
  { value: '', label: 'Todos los estados' },
  { value: 'EMITIDO', label: 'Emitido' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'REVOCADO', label: 'Revocado' },
];

export function CertificadosEmitidosPage() {
  const [items, setItems] = useState<CertificadoCapacitacion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [estado, setEstado] = useState('');

  const cargar = useCallback(
    async (p: number, texto: string) => {
      setLoading(true);
      try {
        const res = await certificadosCapacitacionService.listar({
          page: p,
          limit,
          ...(texto ? { search: texto } : {}),
          ...(estado ? { estado: estado as 'EMITIDO' | 'VENCIDO' | 'REVOCADO' } : {}),
        });
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setItems([]);
        setTotal(0);
        toast.error(mensajeError(err, 'No se pudieron cargar los certificados'));
      } finally {
        setLoading(false);
      }
    },
    [limit, estado],
  );

  useEffect(() => {
    cargar(1, search);
  }, [cargar, search]);

  const handleDescargar = async (codigo: string) => {
    try {
      const blob = await certificadosCapacitacionService.descargar(codigo);
      descargarBlob(blob, `${codigo}.pdf`);
      toast.success('Certificado descargado');
    } catch (err) {
      toast.error(mensajeError(err, 'Error al descargar el certificado'));
    }
  };

  const handleCopiar = async (codigo: string) => {
    const url = `${window.location.origin}/validar-certificado-capacitacion/${codigo}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const cols: ColumnDef<CertificadoCapacitacion, unknown>[] = useMemo(
    () => [
      {
        header: 'Código',
        cell: ({ row }) => <span className={styles.codigo}>{row.original.codigo}</span>,
      },
      {
        header: 'Participante',
        cell: ({ row }) => (
          <span>
            <span className={styles.principal}>
              {row.original.participante?.nombre ?? `#${row.original.participanteId}`}
            </span>
            <span className={styles.secundario}>
              {row.original.participante ? `CI ${row.original.participante.ci}` : ''}
            </span>
          </span>
        ),
      },
      {
        header: 'Curso',
        cell: ({ row }) => <span>{row.original.curso?.nombre ?? row.original.cursoId}</span>,
      },
      {
        header: 'Programación',
        cell: ({ row }) => (
          <span>
            {row.original.programacion
              ? formatDate(row.original.programacion.fechaInicio)
              : `#${row.original.programacionId}`}
          </span>
        ),
      },
      { header: 'Emisión', cell: ({ row }) => <span>{formatDate(row.original.emitidoEn)}</span> },
      {
        header: 'Vigencia',
        cell: ({ row }) => <span>{formatDate(row.original.vigenciaHasta)}</span>,
      },
      {
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={varianteVigencia(row.original.estadoVigencia)} size="sm">
            {row.original.estadoVigencia ?? row.original.estado}
          </Badge>
        ),
      },
      {
        header: 'Acciones',
        cell: ({ row }) => (
          <div className={styles.actions}>
            <Button
              size="sm"
              variant="ghost"
              data-testid="descargar-pdf"
              onClick={() => handleDescargar(row.original.codigo)}
            >
              PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              data-testid="copiar-link"
              onClick={() => handleCopiar(row.original.codigo)}
            >
              Link
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Capacitaciones', 'Certificados']}
        titulo="Certificados Emitidos"
        subtitulo="Certificados de capacitación (PDF con QR de validación)"
      />

      <div className={styles.filters}>
        <Input
          placeholder="Buscar por código, participante o CI..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput.trim())}
        />
        <Select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          options={opcionesEstado}
        />
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
          }}
        >
          Limpiar
        </Button>
      </div>

      {loading ? (
        <Spinner size="md" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aún no hay certificados emitidos"
          description="Emite certificados desde el detalle de una programación"
          actionLabel="Ir a programaciones"
          onAction={() => {
            window.location.href = '/admin/sippci/capacitaciones/programaciones';
          }}
        />
      ) : (
        <>
          <Table columns={cols} data={items} emptyMessage="Sin certificados" />
          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => cargar(page - 1, search)}
            >
              Anterior
            </Button>
            <span className={styles.pageInfo}>
              Página {page} de {totalPages} • {total} registros
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => cargar(page + 1, search)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
