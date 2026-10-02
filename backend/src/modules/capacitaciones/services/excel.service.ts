import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export const COLUMNAS_EXCEL = [
  'Nombre completo',
  'Carnet',
  'Expedido',
  'Email',
  'Telefono',
  'Curso(s)',
];

export interface ParticipanteExcel {
  nombreCompleto: string;
  carnet: string;
  expedido: string;
  email?: string;
  telefono?: string;
  cursos: string[];
}

const EXPEDIDOS_VALIDOS = [
  'LP', 'CB', 'SC', 'CH', 'OR', 'PT', 'TJ', 'BE', 'PA',
];

@Injectable()
export class ExcelService {
  parsearLista(buffer: Buffer): ParticipanteExcel[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (!rows.length) throw new BadRequestException('El archivo esta vacio');

    const participantes: ParticipanteExcel[] = [];
    const carnets = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nombreCompleto = String(row['Nombre completo']).trim();
      const carnet = String(row['Carnet']).trim();
      const expedido = String(row['Expedido']).trim().toUpperCase();
      const email = String(row['Email']).trim();
      const telefono = String(row['Telefono']).trim();
      const cursosRaw = String(row['Curso(s)']).trim();

      if (!nombreCompleto || !carnet) {
        throw new BadRequestException(
          `Fila ${i + 2}: "Nombre completo" y "Carnet" son obligatorios`,
        );
      }
      if (carnets.has(carnet)) {
        throw new BadRequestException(`Fila ${i + 2}: Carnet ${carnet} duplicado`);
      }
      carnets.add(carnet);

      if (expedido && !EXPEDIDOS_VALIDOS.includes(expedido)) {
        throw new BadRequestException(
          `Fila ${i + 2}: Expedido "${expedido}" no es valido. Valores: ${EXPEDIDOS_VALIDOS.join(', ')}`,
        );
      }
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new BadRequestException(`Fila ${i + 2}: Email "${email}" invalido`);
      }

      const cursos = cursosRaw
        .split(/[,;]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      if (!cursos.length) {
        throw new BadRequestException(
          `Fila ${i + 2}: Debe indicar al menos un curso en "Curso(s)"`,
        );
      }

      participantes.push({
        nombreCompleto,
        carnet,
        expedido: expedido || 'LP',
        email: email || undefined,
        telefono: telefono || undefined,
        cursos,
      });
    }
    return participantes;
  }

  generarPlantilla(): Buffer {
    const data = [
      {
        'Nombre completo': 'Juan Perez Lopez',
        Carnet: '1234567',
        Expedido: 'LP',
        Email: 'juan@correo.com',
        Telefono: '71234567',
        'Curso(s)': 'PRIMEROS_AUXILIOS, EXTINTORES',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

    const colWidths = [
      { wch: 30 },
      { wch: 12 },
      { wch: 10 },
      { wch: 26 },
      { wch: 14 },
      { wch: 40 },
    ];
    ws['!cols'] = colWidths;

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}