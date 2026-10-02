import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, FileUpload, Spinner } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { capacitacionesService, type Participante } from '@/services/capacitaciones.service';
import { descargarBlob } from '@/lib/download';

const BADGE: Record<string, { texto: string; color: string }> = {
  PENDIENTE: { texto: 'Pendiente', color: '#9e9e9e' },
  FORMULARIO_GENERADO: { texto: 'Formulario listo', color: '#1565c0' },
  APROBADO: { texto: 'Aprobado', color: '#2e7d32' },
  RECHAZADO: { texto: 'Rechazado', color: '#c62828' },
  REPROBADO: { texto: 'Reprobado', color: '#ef6c00' },
  CERTIFICADO_EMITIDO: { texto: 'Certificado emitido', color: '#6a1b9a' },
};

interface Props {
  codigo: string;
  onCosto: (total: number) => void;
  onReparticipantes: () => void;
}

export function PasoParticipantes({ codigo, onCosto, onReparticipantes }: Props) {
  const { user } = useAuthStore();
  const esJuridica = user?.tipoPersona === 'JURIDICA';
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [lista, setLista] = useState<Participante[]>([]);
  const [repActivo, setRepActivo] = useState(false);

  const cargar = useCallback(async () => {
    if (!codigo) return;
    setCargando(true);
    try {
      const [r, costo] = await Promise.all([
        capacitacionesService.listarParticipantes(codigo),
        capacitacionesService.costoTotal(codigo),
      ]);
      setLista(r.items);
      setRepActivo(r.items.some((p) => p.esRepresentante));
      onCosto(costo.total);
    } catch (e) {
      console.log('error cargar participantes', e);
    } finally {
      setCargando(false);
    }
  }, [codigo, onCosto]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const descargarPlantilla = async () => {
    try {
      const blob = await capacitacionesService.descargarPlantilla(codigo);
      descargarBlob(blob, 'plantilla_participantes_capacitacion.xlsx');
    } catch {
      toast.error('No se pudo descargar la plantilla');
    }
  };

  const subirExcel = async (file: File) => {
    setSubiendo(true);
    try {
      const r = await capacitacionesService.subirLista(codigo, file);
      toast.success(`${r.creados} participante(s) registrados`);
      await cargar();
      onReparticipantes();
    } catch (e) {
      console.log('error subir lista', e);
      toast.error('No se pudo procesar la lista. Revisa el formato.');
    } finally {
      setSubiendo(false);
    }
  };

  const toggleRep = async (checked: boolean) => {
    try {
      const r = await capacitacionesService.agregarRepresentante(codigo, checked);
      toast.success(r.message ?? 'Representante actualizado');
      await cargar();
      onReparticipantes();
    } catch (e) {
      console.log('error toggle rep', e);
      toast.error('No se pudo actualizar el representante');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await capacitacionesService.eliminarParticipante(id);
      toast.success('Participante eliminado');
      await cargar();
      onReparticipantes();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  if (cargando) return <Spinner />;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p style={{ fontSize: 13, color: '#555' }}>
        {esJuridica
          ? 'Descarga la plantilla, completa una fila por participante y subela. Se generara el formulario PDF de cada uno.'
          : 'Tus datos se tomaran de tu cuenta registrada como unico participante.'}
      </p>
      {esJuridica && (
        <>
          <Button type="button" variant="secondary" onClick={descargarPlantilla}>
            Descargar plantilla Excel
          </Button>
          <FileUpload
            label="Lista Excel de participantes"
            accept=".xlsx,.xls"
            onFileSelect={subirExcel}
          />
          <p style={{ fontSize: 12, color: '#757575' }}>
            Columnas: Nombre completo, Carnet, Expedido, Email, Telefono, Curso(s)
          </p>
        </>
      )}
      {esJuridica && (
        <Checkbox
          checked={repActivo}
          label="Yo (representante legal) tambien me capacito"
          onChange={(e) => toggleRep(e.target.checked)}
        />
      )}
      {!esJuridica && (
        <Button
          type="button"
          variant="primary"
          loading={subiendo}
          onClick={async () => {
            setSubiendo(true);
            try {
              const r = await capacitacionesService.agregarSolicitante(codigo);
              void r;
              toast.success('Tu participacion fue registrada');
              await cargar();
              onReparticipantes();
            } catch {
              toast.error('No se pudo registrar');
            } finally {
              setSubiendo(false);
            }
          }}
        >
          Registrarme como participante
        </Button>
      )}
      {lista.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Participantes ({lista.length})</strong>
          {lista.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              <div>
                <div>
                  {p.nombreCompleto}
                  {p.esRepresentante && <em style={{ marginLeft: 6 }}>(representante)</em>}
                </div>
                <div style={{ color: '#757575' }}>
                  {p.subCodigo} · {p.carnet} ·{' '}
                  {p.relaciones.map((r) => r.curso.nombre).join(', ') || 'Sin cursos'}
                </div>
              </div>
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 9999,
                  fontSize: 11,
                  color: '#fff',
                  background: BADGE[p.estado]?.color ?? '#9e9e9e',
                  whiteSpace: 'nowrap',
                }}
              >
                {BADGE[p.estado]?.texto ?? p.estado}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => eliminar(p.id)}>
                Eliminar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
