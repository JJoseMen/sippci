import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { SolicitudesModule } from './modules/solicitudes/solicitudes.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { CertificadosModule } from './modules/certificados/certificados.module';
import { DeclaracionesModule } from './modules/declaraciones/declaraciones.module';
import { CapacitacionesModule } from './modules/capacitaciones/capacitaciones.module';
import { ProfesionalesModule } from './modules/profesionales/profesionales.module';
import { SippciModule } from './modules/sippci/sippci.module';
import { CumplimientoModule } from './modules/cumplimiento/cumplimiento.module';
import { RenovacionesModule } from './modules/renovaciones/renovaciones.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { DevModule } from './modules/dev/dev.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditoriaModule } from './common/services/auditoria.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    AuditoriaModule,
    PrismaModule,
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    SolicitudesModule,
    DocumentosModule,
    PagosModule,
    CertificadosModule,
    DeclaracionesModule,
    CapacitacionesModule,
    ProfesionalesModule,
    SippciModule,
    CumplimientoModule,
    RenovacionesModule,
    NotificacionesModule,
    AdminModule,
    PublicModule,
    DevModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
