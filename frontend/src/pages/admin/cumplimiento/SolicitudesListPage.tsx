import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Table, Badge, Button, Input, Select, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { cumplimientoService, type SolicitudCumplimiento } from '@/services/cumplimiento.service';
import { formatDate } from '@/lib/format';
import styles from './SolicitudesListPage.module.scss';

interface Props {
  tipo: 'NATURAL' | 'JURIDICA';
}

const estadoOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'OBSERVADA', label: 'Observada' },
  { value: 'INSPECCION_PROGRAMADA', label: 'Inspección programada' },
  { value: 'INFORME_REGISTRADO', label: 'Informe registrado' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'RECHAZADA', label: 'Rechazada' },
  { value: 'CERTIFICADO_EMITIDO', label: 'Certificado emitido' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'RENOVADO', label: 'Renovado' },
  { value: 'ANULADA', label: 'Anulada' },
];

const riesgoOptions = [
  { value: '', label: 'Todos los riesgos' },
  { value: 'BAJO', label: 'Bajo' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'ALTO', label: 'Alto' },
];

function variantPorEstado(estado: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (estado) {
    case 'APROBADA':
    case 'CERTIFICADO_EMITIDO':
    case 'INFORME_REGISTRADO':
      return 'success';
    case 'OBSERVADA':
    case 'RECHAZADA':
    case 'ANULADA':
      return 'danger';
    case 'EN_REVISION':
    case 'INSPECCION_PROGRAMADA':
      return 'warning';
    case 'ENVIADA':
      return 'info';
    default:
      return 'neutral';
  }
}

function variantPorRiesgo(riesgo: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (riesgo) {
    case 'BAJO':
      return 'success';
    case 'MEDIO':
      return 'warning';
    case 'ALTO':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function CumplimientoListPage({ tipo }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<SolicitudCumplimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [nivelRiesgo, setNivelRiesgo] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const tipoLabel = tipo === 'NATURAL' ? 'Personas Naturales' : 'Personas Jurídicas';
  const basePath = `/admin/sippci/cumplimiento/solicitudes/${tipo.toLowerCase()}`;

  const fetchData = async (p: number, searchVal: string, estadoVal: string, riesgoVal: string) => {
    setLoading(true);
    try {
      const params = {
        page: p,
        limit,
        ...(searchVal ? { search: searchVal } : {}),
        ...(estadoVal ? { estado: estadoVal } : {}),
        ...(riesgoVal ? { nivelRiesgo: riesgoVal } : {}),
      };
      const res =
        tipo === 'NATURAL'
          ? await cumplimientoService.listarNaturales(params)
          : await cumplimientoService.listarJuridicas(params);
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, search, estado, nivelRiesgo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, search, estado, nivelRiesgo]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleLimpiar = () => {
    setSearchInput('');
    setSearch('');
    setEstado('');
    setNivelRiesgo('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const cols: ColumnDef<SolicitudCumplimiento, unknown>[] = useMemo(
    () => [
      { header: 'Nro. Trámite', accessorKey: 'codigoFormulario' },
      {
        header: 'Solicitante',
        cell: ({ row }) => (
          <span>
            {row.original.empresa?.razonSocial ||
              `${row.original.usuario?.nombre ?? ''} ${row.original.usuario?.apellido ?? ''}`.trim() ||
              '-'}
          </span>
        ),
      },
      {
        header: tipo === 'JURIDICA' ? 'NIT' : 'CI',
        cell: ({ row }) => {
          const dj = row.original.datosJson as Record<string, unknown>;
          return <span>{(dj?.ci as string) || (dj?.nit as string) || row.original.empresa?.nit || '-'}</span>;
        },
      },
      {
        header: 'Establecimiento',
        cell: ({ row }) => {
          const dj = row.original.datosJson as Record<string, unknown>;
          return <span>{(dj?.nombreEstablecimiento as string) || '-'}</span>;
        },
      },
      {
        header: 'Nivel Riesgo',
        cell: ({ row }) => {
          const dj = row.original.datosJson as Record<string, unknown>;
          const riesgo = (dj?.nivelRiesgo as string) || 'SIN_ESPECIFICAR';
          return (
            <Badge variant={variantPorRiesgo(riesgo)} size="sm">
              {riesgo}
            </Badge>
          );
        },
      },
      {
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={variantPorEstado(row.original.estado)} size="sm">
            {row.original.estado}
          </Badge>
        ),
      },
      {
        header: 'Fecha',
        cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
      },
      {
        header: 'Acción',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`${basePath}/${row.original.codigoFormulario}`)}
          >
            Ver
          </Button>
        ),
      },
    ],
    [navigate, basePath, tipo],
  );

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Cumplimiento SIPPCI', tipoLabel]}
        titulo={tipo === 'NATURAL' ? 'Solicitudes — Persona Natural' : 'Solicitudes — Persona Jurídica'}
        subtitulo={`${total} solicitudes • ${tipoLabel}`}
      />

      <div className={styles.filters}>
        <Input
          placeholder="Buscar por código o nombre..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          options={estadoOptions}
        />
        <Select
          value={nivelRiesgo}
          onChange={(e) => setNivelRiesgo(e.target.value)}
          options={riesgoOptions}
        />
        <Button variant="secondary" size="sm" onClick={handleSearch}>
          Buscar
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLimpiar}>
          Limpiar
        </Button>
      </div>

      {loading ? (
        <Spinner size="md" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin solicitudes" description="No se encontraron solicitudes para este filtro" />
      ) : (
        <>
          <Table columns={cols} data={items} emptyMessage="Sin solicitudes" />
          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => fetchData(page - 1, search, estado, nivelRiesgo)}
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
              onClick={() => fetchData(page + 1, search, estado, nivelRiesgo)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
