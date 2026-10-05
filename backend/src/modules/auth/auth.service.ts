import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { KerberosService } from './services/kerberos.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Prisma, TipoCodigo } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otp: OtpService,
    private email: EmailService,
    private kerberos: KerberosService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.email) {
      const exists = await this.prisma.usuarios.findUnique({
        where: { email: dto.email },
      });
      if (exists) throw new ConflictException('Email ya registrado');
    }
    if (dto.ci) {
      const exists = await this.prisma.usuarios_internos.findUnique({
        where: { ci: dto.ci },
      });
      if (exists) throw new ConflictException('CI ya registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [nombre, ...apellidoParts] = dto.nombreCompleto.split(' ');
    const apellido = apellidoParts.join(' ') || nombre;

    const ejecutar = async (tx: Prisma.TransactionClient) => {
      const user = await tx.usuarios.create({
        data: {
          nombre,
          apellido,
          email: dto.email,
          telefono: dto.telefono,
          passwordHash,
          tipo: dto.tipoPersona,
        },
      });

      let empresaId: number | null = null;
      if (dto.tipoPersona === 'JURIDICA' && dto.nit) {
        const empresa = await tx.empresas.create({
          data: {
            nit: dto.nit,
            razonSocial: dto.nombreCompleto,
            representanteLegal: dto.nombreCompleto,
            email: dto.email,
            telefono: dto.telefono,
          },
        });
        empresaId = empresa.id;
        await tx.usuarios_empresas.create({
          data: {
            usuarioId: user.id,
            empresaId: empresa.id,
            rol: 'REPRESENTANTE',
          },
        });
      }

      return { userId: user.id, empresaId };
    };

    const resultado = await this.prisma.$transaction(ejecutar);
    return { message: 'Usuario registrado', ...resultado };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuarios.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Credenciales invalidas');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales invalidas');
    const codigo = this.otp.generarCodigo();
    const hash = await this.otp.hashearCodigo(codigo);
    await this.otp.guardarCodigo(user.id, hash, TipoCodigo.VERIFICAR_CUENTA);
    await this.email.enviarOtp(user.email, codigo);
    const devMode =
      process.env.NODE_ENV === 'development' ||
      process.env.EXPOSE_DEV_OTP === 'true';
    const response: Record<string, unknown> = { message: 'OTP enviado a su email' };
    if (devMode) {
      response._devOtp = codigo;
    }
    return response;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.usuarios.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    const registro = await this.otp.buscarCodigoActivo(
      user.id,
      TipoCodigo.VERIFICAR_CUENTA,
    );
    if (!registro) throw new UnauthorizedException('OTP no encontrado o expirado');
    const ok = await this.otp.verificarCodigo(dto.codigo, registro.codigo);
    if (!ok) {
      await this.otp.incrementarIntentos(user.id);
      throw new UnauthorizedException('OTP incorrecto');
    }
    await this.otp.marcarUsado(registro.id);
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      tipo: 'externo',
      tipoPersona: user.tipo,
    });
    await this.prisma.sesiones.deleteMany({
      where: { usuarioId: user.id },
    });
    await this.prisma.sesiones.create({
      data: {
        usuarioId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        tipo: 'EXTERNO',
        tipoPersona: user.tipo,
      },
    };
  }

  async perfil(userId: number) {
    return this.prisma.usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        tipo: true,
        estado: true,
      },
    });
  }

  async resendOtp(email: string) {
    const user = await this.prisma.usuarios.findUnique({
      where: { email },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    const codigo = this.otp.generarCodigo();
    const hash = await this.otp.hashearCodigo(codigo);
    await this.otp.guardarCodigo(user.id, hash, TipoCodigo.VERIFICAR_CUENTA);
    await this.email.enviarOtp(user.email, codigo);
    return { message: 'OTP reenviado' };
  }

  private readonly logger = new Logger(AuthService.name);

  async kerberosExchange(ticket: string) {
    this.logger.log('kerberosExchange iniciado');
    const payload = await this.kerberos.validarTicket(ticket);
    const ROLES_VALIDOS = [
      'ADMIN',
      'GESTOR_CUMPLIMIENTO',
      'GESTOR_CAPACITACIONES',
      'GESTOR_REGISTRO_PROFESIONAL',
      'CAJERO',
    ];
    if (!ROLES_VALIDOS.includes(payload.rol)) {
      throw new BadRequestException(`Rol SSO no valido: ${payload.rol}`);
    }
    const nombreCompleto =
      payload.nombreCompleto || (payload as { nombre?: string }).nombre || 'Usuario';
    const partes = nombreCompleto.split(' ');
    try {
      let user = await this.prisma.usuarios_internos.findFirst({
        where: { email: payload.email },
      });
      if (!user) {
        user = await this.prisma.usuarios_internos.create({
          data: {
            ci: payload.externalId,
            nombre: partes[0],
            apellido: partes.slice(1).join(' ') || '',
            grado: payload.grado,
            email: payload.email,
            passwordHash: await bcrypt.hash('KERBEROS_SSO', 10),
            rol: payload.rol as any,
          },
        });
      }
      this.logger.log(`kerberosExchange OK usuario=${user.id} rol=${user.rol}`);
      return this.emitirTokenInterno(user);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException('CI ya registrado para otro usuario');
      }
      throw err;
    }
  }

  private async emitirTokenInterno(user: {
    id: number;
    email: string;
    nombre: string;
    apellido: string;
    rol: unknown;
  }) {
    // FIX Kerberos 500 (StrictMode invoca el callback 2 veces con POSTs
    // solapados): deleteMany + create en transacción y jti único por emisión,
    // así dos emisiones en el mismo segundo no colisionan en sesiones.token.
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      tipo: 'interno',
      rol: user.rol,
      jti: randomUUID(),
    });
    await this.prisma.$transaction([
      this.prisma.sesiones.deleteMany({
        where: { usuarioInternoId: user.id },
      }),
      this.prisma.sesiones.create({
        data: {
          usuarioInternoId: user.id,
          token,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
      }),
    ]);
    const TIPO_POR_ROL: Record<string, string> = {
      ADMIN: 'ADMIN',
      GESTOR_CUMPLIMIENTO: 'GESTOR_CUMPLIMIENTO',
      GESTOR_CAPACITACIONES: 'GESTOR_CAPACITACIONES',
      GESTOR_REGISTRO_PROFESIONAL: 'GESTOR_REGISTRO_PROFESIONAL',
      CAJERO: 'CAJERO',
    };
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        tipo: TIPO_POR_ROL[String(user.rol)] ?? 'GESTOR_CUMPLIMIENTO',
      },
    };
  }
}
