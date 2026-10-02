import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoParticipante } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const aBooleano = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class QueryParticipanteProgramacionDto {
  @ApiPropertyOptional({ description: 'Busca por nombre o CI del participante' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtra por estado de la persona',
    enum: EstadoParticipante,
    example: EstadoParticipante.APROBADO,
  })
  @IsOptional()
  @IsEnum(EstadoParticipante)
  estado?: EstadoParticipante;

  @ApiPropertyOptional({ description: 'Filtra por aprobado', enum: ['true', 'false'] })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  aprobado?: boolean;

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
