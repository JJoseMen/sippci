import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RepresentanteDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  esRepresentante!: boolean;
}

export class ObservacionDto {
  @ApiPropertyOptional({ example: 'Documento sin validez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  observacion?: string;
}