import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCumplimientoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn([
    'BORRADOR', 'ENVIADA', 'EN_REVISION', 'OBSERVADA',
    'INSPECCION_PROGRAMADA', 'INFORME_REGISTRADO',
    'APROBADA', 'RECHAZADA', 'CERTIFICADO_EMITIDO',
    'VENCIDO', 'RENOVADO', 'ANULADA'
  ])
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['BAJO', 'MEDIO', 'ALTO'])
  nivelRiesgo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaDesde?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fechaHasta?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
