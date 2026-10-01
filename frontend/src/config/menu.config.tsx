import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  FileText,
  Award,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  Shield,
  CheckCircle,
  FileCheck,
  BookOpen,
  UserPlus,
  ClipboardCheck,
  List,
  Bell,
  CalendarDays,
} from 'lucide-react';

export interface MenuItem {
  label: string;
  path?: string;
  icon?: ReactNode;
  children?: MenuItem[];
  badge?: number;
}

export type RolInterno =
  | 'ADMIN'
  | 'GESTOR_CUMPLIMIENTO'
  | 'GESTOR_CAPACITACIONES'
  | 'GESTOR_REGISTRO_PROFESIONAL'
  | 'CAJERO';

const dashboard: MenuItem = {
  label: 'Dashboard',
  path: '/admin/dashboard',
  icon: <LayoutDashboard size={20} />,
};

export const MENU_POR_ROL: Record<RolInterno, MenuItem[]> = {
  ADMIN: [
    dashboard,
    {
      label: 'SIPPCI',
      icon: <Shield size={20} />,
      children: [
        {
          label: 'Profesionales',
          icon: <UserPlus size={18} />,
          children: [
            {
              label: 'Solicitudes Natural',
              path: '/admin/profesionales/solicitudes/natural',
              icon: <FileText size={16} />,
            },
            {
              label: 'Solicitudes Jurídica',
              path: '/admin/profesionales/solicitudes/juridica',
              icon: <FileCheck size={16} />,
            },
            {
              label: 'Lista Naturales',
              path: '/admin/profesionales/lista/naturales',
              icon: <List size={16} />,
            },
            {
              label: 'Lista Jurídicas',
              path: '/admin/profesionales/lista/juridicas',
              icon: <List size={16} />,
            },
            {
              label: 'Certificados',
              path: '/admin/profesionales/certificados',
              icon: <Award size={16} />,
            },
            {
              label: 'Reportes',
              path: '/admin/profesionales/reportes',
              icon: <BarChart3 size={16} />,
            },
          ],
        },
        {
          label: 'Cumplimiento',
          icon: <Shield size={18} />,
          children: [
            {
              label: 'Solicitudes Natural',
              path: '/admin/sippci/cumplimiento/solicitudes/natural',
              icon: <FileText size={16} />,
            },
            {
              label: 'Solicitudes Jurídica',
              path: '/admin/sippci/cumplimiento/solicitudes/juridica',
              icon: <FileCheck size={16} />,
            },
            {
              label: 'Inspecciones',
              path: '/admin/sippci/cumplimiento/inspecciones',
              icon: <ClipboardCheck size={16} />,
            },
            {
              label: 'Certificados',
              path: '/admin/sippci/cumplimiento/certificados',
              icon: <Award size={16} />,
            },
            {
              label: 'Reportes',
              path: '/admin/sippci/cumplimiento/reportes',
              icon: <BarChart3 size={16} />,
            },
          ],
        },
        {
          label: 'Capacitaciones',
          path: '/admin/sippci/capacitaciones/programaciones',
          icon: <BookOpen size={18} />,
        },
        {
          label: 'Instructores',
          path: '/admin/sippci/capacitaciones/instructores',
          icon: <Users size={18} />,
        },
      ],
    },
    {
      label: 'Administración',
      icon: <Settings size={20} />,
      children: [
        {
          label: 'Usuarios',
          path: '/admin/usuarios',
          icon: <Users size={18} />,
        },
        {
          label: 'Auditoría',
          path: '/admin/auditoria',
          icon: <ClipboardCheck size={18} />,
        },
        {
          label: 'Configuración',
          path: '/admin/configuracion',
          icon: <Settings size={18} />,
        },
      ],
    },
  ],

  GESTOR_REGISTRO_PROFESIONAL: [
    dashboard,
    {
      label: 'Profesionales',
      icon: <UserPlus size={20} />,
      children: [
        {
          label: 'Solicitudes Natural',
          path: '/admin/profesionales/solicitudes/natural',
          icon: <FileText size={18} />,
        },
        {
          label: 'Solicitudes Jurídica',
          path: '/admin/profesionales/solicitudes/juridica',
          icon: <FileCheck size={18} />,
        },
        {
          label: 'Lista Naturales',
          path: '/admin/profesionales/lista/naturales',
          icon: <List size={18} />,
        },
        {
          label: 'Lista Jurídicas',
          path: '/admin/profesionales/lista/juridicas',
          icon: <List size={18} />,
        },
        {
          label: 'Certificados',
          path: '/admin/profesionales/certificados',
          icon: <Award size={18} />,
        },
        {
          label: 'Reportes',
          path: '/admin/profesionales/reportes',
          icon: <BarChart3 size={18} />,
        },
      ],
    },
  ],

  GESTOR_CAPACITACIONES: [
    dashboard,
    {
      label: 'Capacitaciones',
      icon: <BookOpen size={20} />,
      children: [
        {
          label: 'Cursos',
          path: '/admin/sippci/capacitaciones/cursos',
          icon: <BookOpen size={18} />,
        },
        {
          label: 'Instructores',
          path: '/admin/sippci/capacitaciones/instructores',
          icon: <Users size={18} />,
        },
        {
          label: 'Programaciones',
          path: '/admin/sippci/capacitaciones/programaciones',
          icon: <CalendarDays size={18} />,
        },
        {
          label: 'Listas',
          path: '/admin/sippci/capacitaciones/listas',
          icon: <List size={18} />,
        },
        {
          label: 'Puntajes',
          path: '/admin/sippci/capacitaciones/puntajes',
          icon: <BarChart3 size={18} />,
        },
        {
          label: 'Certificados',
          path: '/admin/sippci/capacitaciones/certificados',
          icon: <Award size={18} />,
        },
      ],
    },
  ],

  GESTOR_CUMPLIMIENTO: [
    dashboard,
    {
      label: 'Cumplimiento SIPPCI',
      icon: <Shield size={20} />,
      children: [
        {
          label: 'Solicitudes Natural',
          path: '/admin/sippci/cumplimiento/solicitudes/natural',
          icon: <FileText size={18} />,
        },
        {
          label: 'Solicitudes Jurídica',
          path: '/admin/sippci/cumplimiento/solicitudes/juridica',
          icon: <FileCheck size={18} />,
        },
        {
          label: 'Inspecciones',
          path: '/admin/sippci/cumplimiento/inspecciones',
          icon: <ClipboardCheck size={18} />,
        },
        {
          label: 'Certificados',
          path: '/admin/sippci/cumplimiento/certificados',
          icon: <Award size={18} />,
        },
        {
          label: 'Reportes',
          path: '/admin/sippci/cumplimiento/reportes',
          icon: <BarChart3 size={18} />,
        },
      ],
    },
    { label: 'Notificaciones', path: '/admin/notificaciones', icon: <Bell size={20} /> },
  ],

  CAJERO: [
    dashboard,
    {
      label: 'Pagos',
      icon: <DollarSign size={20} />,
      children: [
        {
          label: 'Todos',
          path: '/admin/pagos',
          icon: <DollarSign size={18} />,
        },
        {
          label: 'Pendientes',
          path: '/admin/pagos/pendientes',
          icon: <FileText size={18} />,
        },
        {
          label: 'Verificados',
          path: '/admin/pagos/verificados',
          icon: <CheckCircle size={18} />,
        },
        {
          label: 'Observados',
          path: '/admin/pagos/observados',
          icon: <FileCheck size={18} />,
        },
      ],
    },
  ],
};
