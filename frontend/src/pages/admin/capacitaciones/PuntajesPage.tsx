import { SectionTitle } from '@/components/admin/SectionTitle';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';

export function PuntajesPage() {
  return (
    <div>
      <SectionTitle
        breadcrumb={['Admin', 'Capacitaciones', 'Puntajes']}
        titulo="Puntajes"
        subtitulo="Reporte de puntajes por participante"
      />
      <EmptyState
        title="Próximamente"
        description="El reporte centralizado de puntajes está pendiente para una fase futura. Hoy el puntaje se registra desde el detalle de cada programación."
        actionLabel="Ir a programaciones"
        onAction={() => {
          window.location.href = '/admin/sippci/capacitaciones/programaciones';
        }}
      />
    </div>
  );
}
