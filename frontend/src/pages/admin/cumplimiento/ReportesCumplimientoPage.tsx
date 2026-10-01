import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Button, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { cumplimientoService } from '@/services/cumplimiento.service';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from './ReportesCumplimientoPage.module.scss';

const COLORES_ESTADO: Record<string, string> = {
  BORRADOR: '#9ca3af',
  ENVIADA: '#93c5fd',
  EN_REVISION: '#3b82f6',
  OBSERVADA: '#facc15',
  INSPECCION_PROGRAMADA: '#f97316',
  INFORME_REGISTRADO: '#14b8a6',
  APROBADA: '#86efac',
  RECHAZADA: '#ef4444',
  CERTIFICADO_EMITIDO: '#15803d',
  VENCIDO: '#fb923c',
  RENOVADO: '#a78bfa',
  ANULADA: '#6b7280',
};

const COLORES_RIESGO: Record<string, string> = {
  BAJO: '#16a34a',
  MEDIO: '#f59e0b',
  ALTO: '#dc2626',
  SIN_ESPECIFICAR: '#9ca3af',
};

export function ReportesCumplimientoPage() {
  const [estados, setEstados] = useState<Array<{ estado: string; total: number }>>([]);
  const [porMes, setPorMes] = useState<Array<{ mes: string; total: number }>>([]);
  const [porRiesgo, setPorRiesgo] = useState<Array<{ nivel: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      cumplimientoService.reporteEstados(),
      cumplimientoService.reporteCertificadosPorMes(),
      cumplimientoService.reporteNivelRiesgo(),
    ])
      .then(([e, m, r]) => {
        setEstados(e);
        setPorMes(m);
        setPorRiesgo(r);
      })
      .catch(() => {
        toast.error('No se pudieron cargar los reportes');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExport = (tipo: string) => {
    toast.info(`${tipo} — Próximamente`);
  };

  const pieData = estados.map((r) => ({
    name: r.estado,
    value: r.total,
    color: COLORES_ESTADO[r.estado] || '#6b7280',
  }));

  const barMesData = porMes.map((r) => {
    let label = r.mes;
    try {
      const d = parse(r.mes, 'yyyy-MM', new Date());
      label = format(d, 'MMM yyyy', { locale: es });
    } catch {
      // fallback raw
    }
    return { mes: label, total: r.total };
  });

  const barRiesgoData = porRiesgo.map((r) => ({
    nivel: r.nivel,
    total: r.total,
    color: COLORES_RIESGO[r.nivel] || '#9ca3af',
  }));

  if (loading) return <Spinner size="md" />;

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Cumplimiento SIPPCI', 'Reportes']}
        titulo="Reportes de Cumplimiento SIPPCI"
        subtitulo="Estadísticas del módulo de Certificación SIPPCI"
      />

      <div className={styles.filters}>
        <Button variant="secondary" size="sm" onClick={() => handleExport('Exportar PDF')}>
          Exportar PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleExport('Exportar Excel')}>
          Exportar Excel
        </Button>
      </div>

      <div className={styles.grid}>
        {/* CARD 1 - PieChart estados */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Solicitudes por Estado</h3>
          {pieData.length === 0 ? (
            <EmptyState title="Sin datos" description="No hay solicitudes registradas" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CARD 2 - BarChart certificados por mes */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Certificados Emitidos por Mes</h3>
          {barMesData.length === 0 ? (
            <EmptyState title="Sin datos" description="Aún no hay certificados emitidos" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barMesData}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#0f1f3c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CARD 3 - BarChart horizontal nivel riesgo */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Solicitudes por Nivel de Riesgo</h3>
          {barRiesgoData.length === 0 ? (
            <EmptyState title="Sin datos" description="Sin solicitudes clasificadas por riesgo" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, barRiesgoData.length * 40 + 40)}>
              <BarChart data={barRiesgoData} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="nivel" type="category" width={160} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {barRiesgoData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
