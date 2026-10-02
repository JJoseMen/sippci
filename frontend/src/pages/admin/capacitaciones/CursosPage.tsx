import { useEffect, useState } from 'react';
import { SectionTitle } from '@/components/admin/SectionTitle';
import { Badge, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { capacitacionesService } from '@/services/capacitaciones.service';
import type { Curso } from '@/types/capacitacion.types';
import styles from './CursosPage.module.scss';

export function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    capacitacionesService
      .listarCursos()
      .then(setCursos)
      .catch(() => setCursos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <SectionTitle
        breadcrumb={['Admin', 'Capacitaciones', 'Cursos']}
        titulo="Cursos"
        subtitulo="Catálogo fijo de cursos del módulo de capacitación"
      />

      {loading ? (
        <Spinner size="md" />
      ) : cursos.length === 0 ? (
        <EmptyState title="Sin cursos" description="No se pudieron cargar los cursos" />
      ) : (
        <div className={styles.grid}>
          {cursos.map((curso) => (
            <div key={curso.id} className={styles.card}>
              <div className={styles.encabezado}>
                <span className={styles.nombre}>{curso.nombre}</span>
                <Badge variant="neutral" size="sm">
                  {curso.modalidad}
                </Badge>
              </div>
              <p className={styles.descripcion}>{curso.descripcion || 'Sin descripción'}</p>
              <div className={styles.meta}>
                <span>{curso.duracionHoras ? `${curso.duracionHoras} h` : '—'}</span>
                <span>{curso.costoBsf ? `Bs ${curso.costoBsf}` : 'Sin costo'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
