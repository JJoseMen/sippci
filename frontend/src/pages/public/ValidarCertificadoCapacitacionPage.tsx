import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button, Badge, Spinner } from '@/components/ui';
import { publicService } from '@/services/public.service';
import { formatDate, formatDateTime } from '@/lib/format';
import type { CertificadoCapacitacionValidacion } from '@/types/capacitacion.types';
import styles from './ValidarCertificadoCapacitacionPage.module.scss';

function Dato({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <strong>{label}:</strong> {valor}
    </div>
  );
}

export function ValidarCertificadoCapacitacionPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CertificadoCapacitacionValidacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!codigo) return;
    publicService
      .validarCertificadoCapacitacion(codigo)
      .then(setData)
      .catch(() =>
        setData({
          valido: false,
          mensaje: 'No se pudo conectar con el servicio de validación',
        }),
      )
      .finally(() => setLoading(false));
  }, [codigo]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <Spinner size="md" />
          <p className={styles.loadingText}>Validando certificado...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.valido) {
    return (
      <div className={styles.page}>
        <div className={`${styles.card} ${styles.invalido}`}>
          <XCircle size={48} className={styles.iconRed} />
          <h1 className={styles.title}>Certificado No Válido</h1>
          <p className={styles.message}>{data?.mensaje ?? 'No se pudo validar el certificado'}</p>
          <p className={styles.codigo}>Código consultado: {codigo}</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  const instructor = data.instructor
    ? `${data.instructor.nombre} ${data.instructor.apellido}`.trim()
    : null;
  const duracion = data.curso?.duracionHoras ? `${data.curso.duracionHoras} horas` : null;
  const cursoDetalle = [data.curso?.nombre, duracion, data.curso?.modalidad]
    .filter(Boolean)
    .join(' — ');

  const cuerpo = (
    <div className={styles.datos}>
      <div>
        <strong>Participante:</strong> {data.participante?.nombre ?? 'N/D'}
      </div>
      <div>
        <strong>CI:</strong> {data.participante?.ci ?? 'N/D'}
      </div>
      <Dato label="Curso" valor={data.curso?.nombre} />
      <Dato label="Detalle" valor={cursoDetalle} />
      <Dato
        label="Lugar / fecha"
        valor={
          data.programacion
            ? `${data.programacion.lugar ?? '—'} · ${formatDateTime(data.programacion.fechaInicio)}`
            : null
        }
      />
      <Dato label="Instructor" valor={instructor} />
      <Dato label="Código" valor={data.codigo} />
      <Dato label="Emisión" valor={data.fechaEmision ? formatDate(data.fechaEmision) : null} />
      <Dato label="Vigencia" valor={data.fechaVigencia ? formatDate(data.fechaVigencia) : null} />
    </div>
  );

  if (data.vencido) {
    return (
      <div className={styles.page}>
        <div className={`${styles.card} ${styles.vencido}`}>
          <AlertTriangle size={48} className={styles.iconOrange} />
          <h1 className={styles.title}>Certificado Vencido</h1>
          <p className={styles.message}>Este certificado existió pero ya venció</p>
          {cuerpo}
          <div>
            <Badge variant="warning" size="sm">
              VENCIDO
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.card} ${styles.valido}`}>
        <CheckCircle size={48} className={styles.iconGreen} />
        <h1 className={styles.title}>Certificado Válido</h1>
        <p className={styles.message}>
          Este certificado fue emitido por la Dirección Nacional de Bomberos
        </p>
        {cuerpo}
        <div>
          <Badge variant="success" size="sm">
            VIGENTE
          </Badge>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
