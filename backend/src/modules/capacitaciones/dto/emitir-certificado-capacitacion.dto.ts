import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class EmitirCertificadoCapacitacionDto {
  @ApiProperty({ description: 'Id de la programacion', example: 2 })
  @IsInt()
  @IsPositive()
  programacionId!: number;

  @ApiProperty({ description: 'Id del participante (debe estar APROBADO)', example: 4 })
  @IsInt()
  @IsPositive()
  participanteId!: number;

  @ApiPropertyOptional({ maxLength: 500, example: 'Emitido en acta de cierre' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
