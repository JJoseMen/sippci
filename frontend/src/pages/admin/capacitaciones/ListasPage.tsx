import { SectionTitle } from '@/components/admin/SectionTitle';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';

export function ListasPage() {
  return (
    <div>
      <SectionTitle
        breadcrumb={['Admin', 'Capacitaciones', 'Listas']}
        titulo="Listas de asistencia"
        subtitulo="Gestión de listas por programación"
      />
      <EmptyState
        title="Módulo en desarrollo"
        description="Las listas se gestionan desde el detalle de cada programación. Esta vista centralizada está pendiente para una fase futura."
        actionLabel="Ir a programaciones"
        onAction={() => {
          window.location.href = '/admin/sippci/capacitaciones/programaciones';
        }}
      />
    </div>
  );
}
