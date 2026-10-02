import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoParticipante } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryParticipanteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['EXTINTORES', 'PRIMEROS_AUXILIOS', 'EVACUACION', 'TRABAJOS_EN_ALTURA'],
  })
  @IsOptional()
  @IsEnum(['EXTINTORES', 'PRIMEROS_AUXILIOS', 'EVACUACION', 'TRABAJOS_EN_ALTURA'] as const)
  curso?: string;

  @ApiPropertyOptional({ enum: EstadoParticipante })
  @IsOptional()
  @IsEnum(EstadoParticipante)
  estado?: EstadoParticipante;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}