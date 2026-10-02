import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class EmitirLoteCertificadoDto {
  @ApiProperty({ description: 'Id de la programacion', example: 2 })
  @IsInt()
  @IsPositive()
  programacionId!: number;
}
