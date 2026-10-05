import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { QuerySolicitudDto } from './dto/query-solicitud.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Solicitudes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private solicitudesService: SolicitudesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear solicitud (BORRADOR)' })
  async create(@Body() dto: CreateSolicitudDto, @CurrentUser('id') userId: number) {
    return this.solicitudesService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las solicitudes (admin/oficial)' })
  async findAll(@Query() query: QuerySolicitudDto) {
    return this.solicitudesService.findAll(query);
  }

  @Get('mias')
  @ApiOperation({ summary: 'Mis solicitudes' })
  async findMias(@CurrentUser('id') userId: number) {
    return this.solicitudesService.findMias(userId);
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Detalle de solicitud' })
  async findOne(@Param('codigo') codigo: string) {
    return this.solicitudesService.findOne(codigo);
  }

  @Post(':codigo/enviar')
  @ApiOperation({ summary: 'Enviar solicitud (BORRADOR -> EN_REVISION)' })
  async enviar(@Param('codigo') codigo: string, @CurrentUser('id') userId: number) {
    return this.solicitudesService.enviar(codigo, userId);
  }

  @Patch(':codigo/estado')
  @ApiOperation({ summary: 'Cambiar estado de solicitud' })
  async cambiarEstado(
    @Param('codigo') codigo: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.solicitudesService.cambiarEstado(codigo, dto, userId);
  }
}
