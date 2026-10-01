import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearParticipanteCapacitacionDto {
  @ApiProperty({ example: 'Juan Perez Lopez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: '1234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  ci!: string;

  @ApiPropertyOptional({ example: 'juan@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '71234567' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  telefono?: string;
}
