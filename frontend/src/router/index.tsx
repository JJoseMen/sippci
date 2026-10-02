import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { CiudadanoLayout } from '@/layouts/CiudadanoLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { OficialLayout } from '@/layouts/OficialLayout';
import { CajeroLayout } from '@/layouts/CajeroLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { HomePage } from '@/pages/public/HomePage';
import { HistoriaPage } from '@/pages/public/HistoriaPage';
import { UbicacionPage } from '@/pages/public/UbicacionPage';
import { ContactosPage } from '@/pages/public/ContactosPage';
import { TramitesPage } from '@/pages/public/TramitesPage';
import { ConsultaPublicaPage } from '@/pages/public/ConsultaPublicaPage';
import { ValidarCertificadoPage } from '@/pages/public/ValidarCertificadoPage';
import { ValidarCertificadoCapacitacionPage } from '@/pages/public/ValidarCertificadoCapacitacionPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { VerifyOtpPage } from '@/pages/auth/VerifyOtpPage';
import { KerberosLoginPage } from '@/pages/auth/KerberosLoginPage';
import { KerberosCallbackPage } from '@/pages/auth/KerberosCallbackPage';
import { DashboardPage } from '@/pages/ciudadano/DashboardPage';
import { MisSolicitudesPage } from '@/pages/ciudadano/MisSolicitudesPage';
import { NuevaSolicitudPage } from '@/pages/ciudadano/NuevaSolicitudPage';
import { SolicitudDetallePage } from '@/pages/ciudadano/SolicitudDetallePage';
import { FormularioTramitePage } from '@/pages/ciudadano/FormularioTramitePage';
import { NotificacionesPage } from '@/pages/notificaciones/NotificacionesPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { SolicitudesListPage } from '@/pages/admin/SolicitudesListPage';
import { AdminSolicitudDetallePage } from '@/pages/admin/SolicitudDetallePage';
import { UsuariosPage } from '@/pages/admin/UsuariosPage';
import { CertificadosPage } from '@/pages/admin/CertificadosPage';
import { PagosPage } from '@/pages/admin/PagosPage';
import { ReportesPage } from '@/pages/admin/ReportesPage';
import { AuditoriaPage } from '@/pages/admin/AuditoriaPage';
import { SolicitudesListPage as ProfesionalesListPage } from '@/pages/admin/profesionales/SolicitudesListPage';
import { SolicitudDetallePage as ProfesionalesDetallePage } from '@/pages/admin/profesionales/SolicitudDetallePage';
import { ListaProfesionalesPage } from '@/pages/admin/profesionales/ListaProfesionalesPage';
import { CertificadosEmitidosPage } from '@/pages/admin/profesionales/CertificadosEmitidosPage';
import { ReportesPage as ReportesProfesionalesPage } from '@/pages/admin/profesionales/ReportesPage';
import { CumplimientoListPage } from '@/pages/admin/cumplimiento/SolicitudesListPage';
import { CumplimientoDetallePage } from '@/pages/admin/cumplimiento/SolicitudDetallePage';
import { InspeccionesListPage } from '@/pages/admin/cumplimiento/InspeccionesListPage';
import { InspeccionDetallePage } from '@/pages/admin/cumplimiento/InspeccionDetallePage';
import { CertificadosCumplimientoPage } from '@/pages/admin/cumplimiento/CertificadosCumplimientoPage';
import { ReportesCumplimientoPage } from '@/pages/admin/cumplimiento/ReportesCumplimientoPage';
import { ProgramacionesListPage } from '@/pages/admin/capacitaciones/ProgramacionesListPage';
import { ProgramacionDetallePage } from '@/pages/admin/capacitaciones/ProgramacionDetallePage';
import { InstructoresListPage } from '@/pages/admin/capacitaciones/InstructoresListPage';
import { CertificadosEmitidosPage as CertificadosCapacitacionPage } from '@/pages/admin/capacitaciones/CertificadosEmitidosPage';
import { CursosPage } from '@/pages/admin/capacitaciones/CursosPage';
import { ListasPage } from '@/pages/admin/capacitaciones/ListasPage';
import { PuntajesPage } from '@/pages/admin/capacitaciones/PuntajesPage';
import { OficialDashboardPage } from '@/pages/oficial/OficialDashboardPage';
import { SolicitudesAsignadasPage } from '@/pages/oficial/SolicitudesAsignadasPage';
import { RevisionDocumentosPage } from '@/pages/oficial/RevisionDocumentosPage';
import { InspeccionesPage } from '@/pages/oficial/InspeccionesPage';
import { EmisionCertificadosPage } from '@/pages/oficial/EmisionCertificadosPage';
import { CajeroDashboardPage } from '@/pages/cajero/CajeroDashboardPage';
import { VerificacionPagosPage } from '@/pages/cajero/VerificacionPagosPage';
import { EntregaCertificadosPage } from '@/pages/cajero/EntregaCertificadosPage';
import { ReportesCajaPage } from '@/pages/cajero/ReportesCajaPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/historia', element: <HistoriaPage /> },
      { path: '/ubicacion', element: <UbicacionPage /> },
      { path: '/contactos', element: <ContactosPage /> },
      { path: '/tramites', element: <TramitesPage /> },
      { path: '/consulta', element: <ConsultaPublicaPage /> },
      { path: '/validar-certificado/:codigo', element: <ValidarCertificadoPage /> },
      {
        path: '/validar-certificado-capacitacion/:codigo',
        element: <ValidarCertificadoCapacitacionPage />,
      },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-otp', element: <VerifyOtpPage /> },
      { path: '/auth/kerberos', element: <KerberosLoginPage /> },
      { path: '/kerberos/callback', element: <KerberosCallbackPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute allowedRoles={['EXTERNO']}>
        <CiudadanoLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/mis-solicitudes', element: <MisSolicitudesPage /> },
      { path: '/solicitudes/nueva', element: <NuevaSolicitudPage /> },
      { path: '/solicitudes/nueva/:tipo', element: <FormularioTramitePage /> },
      { path: '/solicitudes/:codigo', element: <SolicitudDetallePage /> },
      { path: '/notificaciones', element: <NotificacionesPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute
        allowedRoles={[
          'ADMIN',
          'GESTOR_CUMPLIMIENTO',
          'GESTOR_CAPACITACIONES',
          'GESTOR_REGISTRO_PROFESIONAL',
          'CAJERO',
        ]}
      >
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/admin/dashboard', element: <AdminDashboardPage /> },
      { path: '/admin/solicitudes', element: <SolicitudesListPage /> },
      { path: '/admin/solicitudes/:codigo', element: <AdminSolicitudDetallePage /> },
      {
        path: '/admin/profesionales/solicitudes/natural',
        element: <ProfesionalesListPage tipo="NATURAL" />,
      },
      {
        path: '/admin/profesionales/solicitudes/natural/:codigo',
        element: <ProfesionalesDetallePage tipo="NATURAL" />,
      },
      {
        path: '/admin/profesionales/solicitudes/juridica',
        element: <ProfesionalesListPage tipo="JURIDICA" />,
      },
      {
        path: '/admin/profesionales/solicitudes/juridica/:codigo',
        element: <ProfesionalesDetallePage tipo="JURIDICA" />,
      },
      {
        path: '/admin/profesionales/lista/naturales',
        element: <ListaProfesionalesPage tipo="NATURAL" />,
      },
      {
        path: '/admin/profesionales/lista/juridicas',
        element: <ListaProfesionalesPage tipo="JURIDICA" />,
      },
      { path: '/admin/profesionales/certificados', element: <CertificadosEmitidosPage /> },
      { path: '/admin/profesionales/reportes', element: <ReportesProfesionalesPage /> },
      {
        path: '/admin/sippci/cumplimiento/solicitudes/natural',
        element: <CumplimientoListPage tipo="NATURAL" />,
      },
      {
        path: '/admin/sippci/cumplimiento/solicitudes/natural/:codigo',
        element: <CumplimientoDetallePage tipo="NATURAL" />,
      },
      {
        path: '/admin/sippci/cumplimiento/solicitudes/juridica',
        element: <CumplimientoListPage tipo="JURIDICA" />,
      },
      {
        path: '/admin/sippci/cumplimiento/solicitudes/juridica/:codigo',
        element: <CumplimientoDetallePage tipo="JURIDICA" />,
      },
      { path: '/admin/sippci/cumplimiento/inspecciones', element: <InspeccionesListPage /> },
      { path: '/admin/sippci/cumplimiento/inspecciones/:id', element: <InspeccionDetallePage /> },
      {
        path: '/admin/sippci/cumplimiento/certificados',
        element: <CertificadosCumplimientoPage />,
      },
      { path: '/admin/sippci/cumplimiento/reportes', element: <ReportesCumplimientoPage /> },
      {
        path: '/admin/sippci/capacitaciones/programaciones',
        element: <ProgramacionesListPage />,
      },
      {
        path: '/admin/sippci/capacitaciones/programaciones/:id',
        element: <ProgramacionDetallePage />,
      },
      {
        path: '/admin/sippci/capacitaciones/instructores',
        element: <InstructoresListPage />,
      },
      {
        path: '/admin/sippci/capacitaciones/cursos',
        element: <CursosPage />,
      },
      {
        path: '/admin/sippci/capacitaciones/listas',
        element: <ListasPage />,
      },
      {
        path: '/admin/sippci/capacitaciones/puntajes',
        element: <PuntajesPage />,
      },
      {
        path: '/admin/sippci/capacitaciones/certificados',
        element: <CertificadosCapacitacionPage />,
      },
      { path: '/admin/usuarios', element: <UsuariosPage /> },
      { path: '/admin/certificados', element: <CertificadosPage /> },
      { path: '/admin/pagos', element: <PagosPage /> },
      { path: '/admin/reportes', element: <ReportesPage /> },
      { path: '/admin/auditoria', element: <AuditoriaPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute
        allowedRoles={[
          'ADMIN',
          'GESTOR_CUMPLIMIENTO',
          'GESTOR_CAPACITACIONES',
          'GESTOR_REGISTRO_PROFESIONAL',
          'CAJERO',
        ]}
      >
        <OficialLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/oficial/dashboard', element: <OficialDashboardPage /> },
      { path: '/oficial/solicitudes', element: <SolicitudesAsignadasPage /> },
      { path: '/oficial/solicitudes/:codigo', element: <RevisionDocumentosPage /> },
      { path: '/oficial/inspecciones', element: <InspeccionesPage /> },
      { path: '/oficial/certificados', element: <EmisionCertificadosPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute
        allowedRoles={[
          'ADMIN',
          'GESTOR_CUMPLIMIENTO',
          'GESTOR_CAPACITACIONES',
          'GESTOR_REGISTRO_PROFESIONAL',
          'CAJERO',
        ]}
      >
        <CajeroLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/cajero/dashboard', element: <CajeroDashboardPage /> },
      { path: '/cajero/pagos', element: <VerificacionPagosPage /> },
      { path: '/cajero/entrega', element: <EntregaCertificadosPage /> },
      { path: '/cajero/reportes', element: <ReportesCajaPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
