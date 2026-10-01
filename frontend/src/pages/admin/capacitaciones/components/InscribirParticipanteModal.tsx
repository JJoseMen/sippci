import { useEffect, useState } from 'react';
import { Modal, Button, Input, Spinner } from '@/components/ui';
import { participantesCatalogoService } from '@/services/programaciones.service';
import { mensajeError } from '@/lib/error';
import type { ParticipanteCapacitacion, Programacion } from '@/types/capacitacion.types';
import styles from './capacitaciones.modals.module.scss';

interface Props {
  isOpen: boolean;
  programacion: Programacion | null;
  onClose: () => void;
  onInscribir: (participanteId: number) => Promise<void>;
}

export function InscribirParticipanteModal({ isOpen, programacion, onClose, onInscribir }: Props) {
  const [search, setSearch] = useState('');
  const [resultados, setResultados] = useState<ParticipanteCapacitacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [seleccion, setSeleccion] = useState<ParticipanteCapacitacion | null>(null);
  const [modoAlta, setModoAlta] = useState(false);

  const [nombre, setNombre] = useState('');
  const [ci, setCi] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setResultados([]);
    setSeleccion(null);
    setModoAlta(false);
    setError('');
    setNombre('');
    setCi('');
    setEmail('');
    setTelefono('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || modoAlta) return;
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const res = await participantesCatalogoService.listar({
          search: search.trim() || undefined,
          limit: 10,
        });
        setResultados(res.items);
      } catch (err) {
        setError(mensajeError(err, 'No se pudo cargar el catálogo de participantes'));
      } finally {
        setCargando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen, search, modoAlta]);

  const handleCrear = async () => {
    if (!nombre.trim() || !ci.trim()) {
      setError('Nombre y CI son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const creado = await participantesCatalogoService.crear({
        nombre: nombre.trim(),
        ci: ci.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
      });
      setSeleccion(creado);
      setModoAlta(false);
      setSearch(creado.ci);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo crear el participante'));
    } finally {
      setLoading(false);
    }
  };

  const handleInscribir = async () => {
    if (!seleccion) return;
    setLoading(true);
    setError('');
    try {
      await onInscribir(seleccion.id);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo inscribir al participante'));
    } finally {
      setLoading(false);
    }
  };

  const inscritos = programacion?._count?.participantes ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inscribir participante"
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleInscribir}
            disabled={!seleccion || loading}
            loading={loading}
          >
            Inscribir
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.subtitle}>
          Programación <strong>#{programacion?.id}</strong> — {programacion?.curso?.nombre} ·{' '}
          {inscritos}
          {programacion?.cupo != null ? `/${programacion.cupo}` : ''} inscritos
        </p>

        {!modoAlta && (
          <>
            <Input
              label="Buscar por nombre o CI"
              placeholder="Ej. 1000001 o Juan"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className={styles.listaResultados}>
              {cargando ? (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <Spinner size="sm" />
                </div>
              ) : resultados.length === 0 ? (
                <span className={styles.hint}>Sin resultados en el catálogo</span>
              ) : (
                resultados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.itemResultado} ${
                      seleccion?.id === p.id ? styles.itemSeleccionado : ''
                    }`}
                    onClick={() => setSeleccion(p)}
                  >
                    <span className={styles.itemNombre}>{p.nombre}</span>
                    <span className={styles.itemCi}>CI {p.ci}</span>
                  </button>
                ))
              )}
            </div>

            <div className={styles.fila}>
              <span className={styles.hint}>
                ¿No figura en el catálogo? Créalo antes de inscribir.
              </span>
              <Button variant="secondary" size="sm" onClick={() => setModoAlta(true)}>
                Crear participante
              </Button>
            </div>
          </>
        )}

        {modoAlta && (
          <>
            <div className={styles.grid}>
              <Input
                label="Nombre completo"
                required
                value={nombre}
                maxLength={100}
                onChange={(e) => setNombre(e.target.value)}
              />
              <Input
                label="CI"
                required
                value={ci}
                maxLength={20}
                onChange={(e) => setCi(e.target.value)}
              />
            </div>
            <div className={styles.grid}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Teléfono"
                value={telefono}
                maxLength={15}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div className={styles.fila}>
              <Button variant="ghost" size="sm" onClick={() => setModoAlta(false)}>
                Volver a la búsqueda
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCrear}
                loading={loading}
                disabled={!nombre.trim() || !ci.trim()}
              >
                Crear y seleccionar
              </Button>
            </div>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Modal>
  );
}
