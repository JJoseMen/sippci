import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Input, Select, Button, FileUpload } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { solicitudesService } from '@/services/solicitudes.service';
import { tramiteService, type TipoDocumentoBackend } from '@/services/tramite.service';
import { formatMoney } from '@/lib/format';
import { EXPEDIDOS, BANCOS, CURSOS_CAPACITACION } from './wizardOptions';
import { PasoParticipantes } from './PasoParticipantes';
import styles from './FormularioCapacitacion.module.scss';

const schema = z
  .object({
    tipoPersona: z.enum(['NATURAL', 'JURIDICA']),
    nombreCompleto: z.string().min(2).optional(),
    ci: z.string().min(4).optional(),
    nombrerz: z.string().min(2).optional(),
    nit: z.string().min(5).optional(),
    oficina: z.string().optional(),
    legal: z.string().min(2).optional(),
    cedula: z.string().min(4).optional(),
    expedido: z.string().min(1, 'Selecciona expedido'),
    email: z.string().email('Email invalido'),
    telefono: z.string().optional(),
    cursos: z.array(z.string()).min(1, 'Selecciona al menos un curso'),
    numeroOperacion: z.string().min(1, 'Requerido'),
    fechaDeposito: z.string().min(1, 'Requerido'),
    banco: z.string().min(1, 'Selecciona banco'),
    comprobante: z.string().min(1, 'Adjunta comprobante'),
  })
  .superRefine((data, ctx) => {
    if (data.tipoPersona === 'JURIDICA') {
      if (!data.nombrerz)
        ctx.addIssue({ code: 'custom', path: ['nombrerz'], message: 'Requerido' });
      if (!data.legal) ctx.addIssue({ code: 'custom', path: ['legal'], message: 'Requerido' });
      if (!data.cedula) ctx.addIssue({ code: 'custom', path: ['cedula'], message: 'Requerido' });
    } else if (!data.nombreCompleto) {
      ctx.addIssue({ code: 'custom', path: ['nombreCompleto'], message: 'Requerido' });
    }
  });

type FormData = z.infer<typeof schema>;
const PASOS = ['Solicitante', 'Cursos', 'Participantes', 'Pago'];
const PASO0_FIELDS: (keyof FormData)[] = ['expedido', 'email', 'telefono'];
const ARCHIVOS: { campo: keyof FormData; tipo: TipoDocumentoBackend; requerido: boolean }[] = [
  { campo: 'comprobante', tipo: 'COMPROBANTE_PAGO', requerido: true },
];

export function FormularioCapacitacion() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [paso, setPaso] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [codigoSol, setCodigoSol] = useState('');
  const [costoTotal, setCostoTotal] = useState(0);
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const esJuridica = user?.tipoPersona === 'JURIDICA';
  const nombreCompleto = user ? `${user.nombre} ${user.apellido}`.trim() : '';

  const {
    register,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoPersona: user?.tipoPersona || 'NATURAL',
      email: user?.email || '',
      telefono: '',
      nombreCompleto,
      cursos: [],
    },
  });

  const camposPaso = (step: number): (keyof FormData)[] => {
    if (step === 0) {
      return esJuridica
        ? ['nombrerz', 'nit', 'oficina', 'legal', 'cedula', ...PASO0_FIELDS]
        : ['nombreCompleto', 'ci', ...PASO0_FIELDS];
    }
    if (step === 1) return ['cursos'];
    if (step === 2) return [];
    return ['numeroOperacion', 'fechaDeposito', 'banco', 'comprobante'];
  };

  const crearSolicitud = async (): Promise<string> => {
    const data = watch();
    const sol = await solicitudesService.create({
      tipoTramite: 'CAPACITACION',
      subtipoTramite: data.tipoPersona ?? user?.tipoPersona ?? 'NATURAL',
      datosJson: {
        ...data,
        tipoPersona: data.tipoPersona ?? user?.tipoPersona ?? 'NATURAL',
      },
    });
    setCodigoSol(sol.codigoFormulario);
    return sol.codigoFormulario;
  };

  const avanzar = async () => {
    const ok = await trigger(camposPaso(paso));
    if (!ok) return;
    if (paso === 1 && !codigoSol) {
      setOcupado(true);
      try {
        const codigo = await crearSolicitud();
        void codigo;
      } catch (e) {
        console.log('error crear borrador', e);
        toast.error('No se pudo crear la solicitud');
        setOcupado(false);
        return;
      } finally {
        setOcupado(false);
      }
    }
    setPaso(paso + 1);
  };

  const enviarSolicitud = async () => {
    if (!codigoSol) return;
    setOcupado(true);
    try {
      const data = watch();
      for (const { campo, tipo, requerido } of ARCHIVOS) {
        const file = archivos[campo as string];
        if (!file) {
          if (requerido) throw new Error(`Falta archivo requerido: ${String(campo)}`);
          continue;
        }
        await tramiteService.subirDocumento(codigoSol, tipo, file);
      }
      await tramiteService.registrarPago(codigoSol, {
        numeroOperacion: data.numeroOperacion,
        monto: costoTotal,
        fechaDeposito: data.fechaDeposito,
        banco: data.banco,
      });
      const enviada = await solicitudesService.enviar(codigoSol);
      toast.success(`Solicitud ${enviada.codigoFormulario} enviada`);
      navigate('/mis-solicitudes');
    } catch (e) {
      console.log('error enviar', e);
      toast.error('No se pudo enviar la solicitud');
    } finally {
      setOcupado(false);
    }
  };

  const setFile = (name: keyof FormData) => (file: File) => {
    setValue(name as 'ci', file.name as never);
    setArchivos((prev) => ({ ...prev, [name as string]: file }));
  };

  return (
    <div className={styles['wrap']}>
      <div className={styles['steps']}>
        {PASOS.map((p, i) => (
          <span key={p} className={`${styles['step']} ${i === paso ? styles['active'] : ''}`}>
            {i + 1}. {p}
          </span>
        ))}
      </div>
      <div className={styles['badge']}>{esJuridica ? 'Persona Juridica' : 'Persona Natural'}</div>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: 14 }}>
        {paso === 0 && (
          <>
            {esJuridica ? (
              <>
                <Input
                  label="Razon social"
                  error={errors.nombrerz?.message}
                  {...register('nombrerz')}
                />
                <Input label="NIT" error={errors.nit?.message} {...register('nit')} />
                <Input label="Oficina" error={errors.oficina?.message} {...register('oficina')} />
                <Input
                  label="Representante legal"
                  error={errors.legal?.message}
                  {...register('legal')}
                />
                <Input
                  label="CI del representante"
                  error={errors.cedula?.message}
                  {...register('cedula')}
                />
              </>
            ) : (
              <>
                <Input
                  label="Nombre completo"
                  error={errors.nombreCompleto?.message}
                  {...register('nombreCompleto')}
                />
                <Input label="CI" error={errors.ci?.message} {...register('ci')} />
              </>
            )}
            <Select
              label="Expedido"
              options={EXPEDIDOS}
              error={errors.expedido?.message}
              {...register('expedido')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Email"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input label="Telefono" error={errors.telefono?.message} {...register('telefono')} />
            </div>
          </>
        )}
        {paso === 1 && (
          <>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Cursos</label>
              {CURSOS_CAPACITACION.map((c) => (
                <label key={c.value} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" value={c.value} {...register('cursos')} />
                  <span>
                    {c.label} - {formatMoney(c.costo)}
                  </span>
                </label>
              ))}
              {errors.cursos && <span className={styles['error']}>{errors.cursos.message}</span>}
            </div>
            <p style={{ fontSize: 13, color: '#757575' }}>
              El total a pagar se calcula automaticamente segun los participantes registrados y los
              cursos seleccionados.
            </p>
          </>
        )}
        {paso === 2 && (
          <PasoParticipantes
            codigo={codigoSol}
            onCosto={setCostoTotal}
            onReparticipantes={() => undefined}
          />
        )}
        {paso === 3 && (
          <>
            <Input
              label="Numero de operacion"
              error={errors.numeroOperacion?.message}
              {...register('numeroOperacion')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Monto total (Bs)"
                type="number"
                value={costoTotal}
                onChange={() => undefined}
                style={{ background: '#f5f5f5' }}
              />
              <Input
                label="Fecha deposito"
                type="date"
                error={errors.fechaDeposito?.message}
                {...register('fechaDeposito')}
              />
            </div>
            <Select
              label="Banco"
              options={BANCOS}
              error={errors.banco?.message}
              {...register('banco')}
            />
            <FileUpload
              label="Comprobante"
              accept=".pdf,.jpg,.png"
              required
              error={errors.comprobante?.message}
              onFileSelect={setFile('comprobante')}
            />
          </>
        )}
        <div className={styles['nav']}>
          {paso > 0 && (
            <Button
              type="button"
              variant="ghost"
              disabled={ocupado}
              onClick={() => setPaso(paso - 1)}
            >
              Anterior
            </Button>
          )}
          {paso < 3 && (
            <Button type="button" variant="primary" loading={ocupado} onClick={avanzar}>
              Siguiente
            </Button>
          )}
          {paso === 3 && (
            <Button type="submit" variant="secondary" loading={ocupado} onClick={enviarSolicitud}>
              Enviar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
