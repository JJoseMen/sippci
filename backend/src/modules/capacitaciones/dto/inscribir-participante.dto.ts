import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class InscribirParticipanteDto {
  @ApiProperty({
    example: 1,
    description: 'Id de participantes_capacitacion (persona a inscribir)',
  })
  @IsInt()
  @IsPositive()
  participanteId!: number;
}
