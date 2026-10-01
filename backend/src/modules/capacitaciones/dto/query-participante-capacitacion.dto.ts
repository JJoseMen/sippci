import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoParticipante } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryParticipanteCapacitacionDto {
  @ApiPropertyOptional({ description: 'Busca por nombre o CI' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtra por estado de la persona', enum: EstadoParticipante })
  @IsOptional()
  @IsEnum(EstadoParticipante)
  estado?: EstadoParticipante;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
