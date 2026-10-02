import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryParticipanteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['EXTINTORES', 'PRIMEROS_AUXILIOS', 'EVACUACION', 'TRABAJOS_EN_ALTURA'] })
  @IsOptional()
  @IsEnum(['EXTINTORES', 'PRIMEROS_AUXILIOS', 'EVACUACION', 'TRABAJOS_EN_ALTURA'] as const)
  curso?: string;

  @ApiPropertyOptional({ enum: ['INSCRITO', 'APROBADO', 'REPROBADO'] })
  @IsOptional()
  @IsEnum(['INSCRITO', 'APROBADO', 'REPROBADO'] as const)
  estado?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
