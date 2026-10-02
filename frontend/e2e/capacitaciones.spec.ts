import { test, expect, request as apiRequestFactory } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const GESTOR_CI = '6622222';
const ADMIN_CI = '7711111';
const PASS = '123456';

async function login(page: import('@playwright/test').Page, ci: string) {
  await page.goto('/auth/kerberos');
  await page.fill('#ci', ci);
  await page.fill('#password', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
}

// Instructor de prueba con CI fijo: se reutiliza en todas las corridas para
// que la tabla no acumule instructores inactivos.
const E2E_CI = '99999999';
const INSTRUCTORES_API = '/api/admin/sippci/capacitaciones/instructores';
// Los hooks beforeAll/afterAll no reciben fixtures test-scoped, así que el
// contexto HTTP se crea a mano con el mismo baseURL que playwright.config.ts.
const API_BASE_URL = 'http://localhost:5173';

type AuthHeaders = Record<string, string>;
type InstructorFixture = { id: number; ci: string; activo: boolean };

async function withApi<T>(fn: (ctx: APIRequestContext) => Promise<T>): Promise<T> {
  const ctx = await apiRequestFactory.newContext({ baseURL: API_BASE_URL });
  try {
    return await fn(ctx);
  } finally {
    await ctx.dispose();
  }
}

async function apiAuth(request: APIRequestContext) {
  const res = await request.post('/api/auth/kerberos/exchange', {
    data: { ticket: 'capacitacion' },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { access_token: string };
  return { Authorization: `Bearer ${body.access_token}` };
}

async function buscarFixture(request: APIRequestContext, headers: AuthHeaders) {
  const res = await request.get(`${INSTRUCTORES_API}?search=${E2E_CI}&limit=10`, { headers });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { items: InstructorFixture[] };
  return body.items.find((i) => i.ci === E2E_CI) ?? null;
}

async function reactivarFixture(request: APIRequestContext, headers: AuthHeaders) {
  const existente = await buscarFixture(request, headers);
  if (!existente || existente.activo) return;
  const res = await request.put(`${INSTRUCTORES_API}/${existente.id}`, {
    headers,
    data: { activo: true },
  });
  expect(res.ok()).toBeTruthy();
}

const PROGRAMACIONES_API = '/api/admin/sippci/capacitaciones/programaciones';
// Programación FINALIZADO con participantes sin certificado: apta para resolver.
const PROG_RESULTADOS = 2;
// Programación PROGRAMADO: no apta para resolver resultados.
const PROG_PROGRAMADA = 4;
// Participante de prueba (Carlos Garcia) reutilizado por los tests 15-17.
const PART_RESULTADOS = 4;

type EstadoParticipanteE2E = 'INSCRITO' | 'APROBADO' | 'REPROBADO';

type InscripcionE2E = {
  participanteId: number;
  participante?: { estado: string } | null;
};

// Deja al participante en el estado pedido. Si había un resultado previo,
// envía justificación: la API la exige al corregir (mínimo 10 caracteres).
async function fijarEstadoParticipante(
  request: APIRequestContext,
  headers: AuthHeaders,
  programacionId: number,
  participanteId: number,
  estado: EstadoParticipanteE2E,
) {
  const listado = await request.get(
    `${PROGRAMACIONES_API}/${programacionId}/participantes?limit=100`,
    { headers },
  );
  expect(listado.ok()).toBeTruthy();
  const body = (await listado.json()) as { items: InscripcionE2E[] };
  const inscripcion = body.items.find((i) => i.participanteId === participanteId);
  expect(inscripcion, 'La inscripción debe existir antes del test').toBeTruthy();

  const previo = inscripcion?.participante?.estado ?? 'INSCRITO';
  if (previo === estado) return;

  const data: Record<string, unknown> = { estado };
  if (previo !== 'INSCRITO') {
    data.justificacion = 'Reinicio automatico de la prueba E2E';
  }

  const res = await request.put(
    `${PROGRAMACIONES_API}/${programacionId}/participantes/${participanteId}/estado`,
    { headers, data },
  );
  expect(res.ok(), `No se pudo fijar el estado ${previo} -> ${estado}`).toBeTruthy();
}

async function abrirParticipantes(
  page: import('@playwright/test').Page,
  programacionId: number,
) {
  await page.goto(`/admin/sippci/capacitaciones/programaciones/${programacionId}`);
  await page.getByRole('button', { name: /^Participantes \(\d+\)$/ }).click();
}

test.describe('Capacitación — Programaciones (GESTOR_CAPACITACIONES)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, GESTOR_CI);
  });

  test('1. Sidebar muestra Programaciones bajo Capacitaciones', async ({ page }) => {
    await expect(page.getByText('Programaciones', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Instructores', { exact: true }).first()).toBeVisible();
  });

  test('2. Listado carga con los datos de prueba de la BD', async ({ page }) => {
    await page.goto('/admin/sippci/capacitaciones/programaciones');
    await expect(page.getByRole('heading', { name: 'Programaciones' })).toBeVisible();

    const tabla = page.locator('table tbody');
    await expect(tabla.locator('tr')).toHaveCount(4);
    await expect(tabla.getByText('EXTINTORES').first()).toBeVisible();
    await expect(tabla.getByText('Programado', { exact: true })).toBeVisible();
    await expect(tabla.getByText('Finalizado', { exact: true })).toBeVisible();
    await expect(tabla.getByText('Cancelado', { exact: true })).toBeVisible();
  });

  test('3. Filtro por estado devuelve una sola programación', async ({ page }) => {
    await page.goto('/admin/sippci/capacitaciones/programaciones');
    await expect(page.locator('table tbody tr')).toHaveCount(4);

    await page.selectOption('select >> nth=0', 'FINALIZADO');
    const tabla = page.locator('table tbody');
    await expect(tabla.locator('tr')).toHaveCount(1);
    await expect(tabla.getByText('Finalizado', { exact: true })).toBeVisible();
    await expect(tabla.getByText('Programado', { exact: true })).toHaveCount(0);
  });

  test('4. Detalle PROGRAMADO muestra datos y acciones de transición', async ({ page }) => {
    await page.goto('/admin/sippci/capacitaciones/programaciones/4');
    await expect(page.getByRole('heading', { name: 'EXTINTORES #4' })).toBeVisible();
    await expect(page.getByText('Aula Test Cupo')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reprogramar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  });

  test('5. Detalle FINALIZADO no ofrece transiciones ni edición', async ({ page }) => {
    await page.goto('/admin/sippci/capacitaciones/programaciones/2');
    await expect(page.getByRole('heading', { name: /#2$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finalizar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reprogramar' })).toHaveCount(0);
  });

  test('6. Pestaña Participantes lista los inscritos reales', async ({ page }) => {
    await page.goto('/admin/sippci/capacitaciones/programaciones/3');
    await expect(page.getByRole('heading', { name: /#3$/ })).toBeVisible();

    await page.getByRole('button', { name: /^Participantes \(\d+\)$/ }).click();
    const tabla = page.locator('table tbody');
    await expect(tabla.locator('tr')).toHaveCount(2);
    await expect(tabla.getByText('Ana Torres')).toBeVisible();
    await expect(tabla.getByText('Luis Mamani')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inscribir participante' })).toBeVisible();
  });

  test('7. Modal de nueva programación abre y valida', async ({ page }) => {
    await page.goto('/admin/sippci/capacitaciones/programaciones');
    await page.getByRole('button', { name: 'Nueva programación' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear', exact: true })).toBeDisabled();
  });

  test('8. Modal de inscripción abre con el buscador del catálogo', async ({ page }) => {
    await page.goto('/admin/sippci/capacitaciones/programaciones/4');
    await page.getByRole('button', { name: /^Participantes \(\d+\)$/ }).click();
    await page.getByRole('button', { name: 'Inscribir participante' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder('Ej. 1000001 o Juan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear participante' })).toBeVisible();
  });
});

test.describe('Capacitación — Programaciones (ADMIN solo lectura)', () => {
  test('9. ADMIN ve el listado sin acciones de escritura', async ({ page }) => {
    await login(page, ADMIN_CI);

    // El menú lateral sí lleva a Capacitaciones (enlace plano)
    await expect(
      page.locator('aside nav a[href="/admin/sippci/capacitaciones/programaciones"]'),
    ).toBeVisible();

    await page.goto('/admin/sippci/capacitaciones/programaciones');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva programación' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Iniciar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  });

  test('10. ADMIN ve el detalle en modo lectura', async ({ page }) => {
    await login(page, ADMIN_CI);
    await page.goto('/admin/sippci/capacitaciones/programaciones/4');

    await expect(page.getByRole('heading', { name: 'EXTINTORES #4' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar' })).toHaveCount(0);
  });
});

test.describe('Capacitación — Instructores', () => {
  // Garantiza un único instructor de prueba (CI fijo) en estado activo antes
  // de cada corrida. Si no existe, se crea; si quedó inactivo, se reactiva.
  test.beforeAll(async () => {
    await withApi(async (request) => {
      const headers = await apiAuth(request);
      const existente = await buscarFixture(request, headers);
      if (existente) {
        await reactivarFixture(request, headers);
        return;
      }
      const res = await request.post(INSTRUCTORES_API, {
        headers,
        data: {
          nombre: 'E2E',
          apellido: 'Docente',
          ci: E2E_CI,
          email: 'e2e.docente@bomberos.bo',
          especialidad: 'Pruebas E2E',
        },
      });
      expect(res.ok()).toBeTruthy();
    });
  });

  // Limpieza: reactiva el instructor de prueba para que la siguiente corrida
  // no encuentre instructores inactivos acumulados.
  test.afterAll(async () => {
    await withApi(async (request) => {
      const headers = await apiAuth(request);
      await reactivarFixture(request, headers);
    });
  });

  test('11. GESTOR: listado con instructores reales y acción de alta', async ({ page }) => {
    await login(page, GESTOR_CI);
    await page.goto('/admin/sippci/capacitaciones/instructores');

    await expect(page.getByRole('heading', { name: 'Instructores' })).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByText('Activo', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo instructor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar' }).first()).toBeVisible();
  });

  test('12. GESTOR: el modal de nuevo instructor exige los campos obligatorios', async ({
    page,
  }) => {
    await login(page, GESTOR_CI);
    await page.goto('/admin/sippci/capacitaciones/instructores');
    await page.getByRole('button', { name: 'Nuevo instructor' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear', exact: true })).toBeDisabled();

    await page.getByPlaceholder('Juan', { exact: true }).fill('E2E');
    await page.getByPlaceholder('Perez Lopez', { exact: true }).fill('Docente');
    await expect(page.getByRole('button', { name: 'Crear', exact: true })).toBeDisabled();

    await page.getByPlaceholder('12345678', { exact: true }).fill(String(Date.now()).slice(-7));
    await expect(page.getByRole('button', { name: 'Crear', exact: true })).toBeEnabled();
  });

  test('13. GESTOR: filtra, edita y desactiva el instructor de prueba', async ({ page }) => {
    await login(page, GESTOR_CI);
    await page.goto('/admin/sippci/capacitaciones/instructores');

    // El instructor de prueba (CI fijo) ya existe: lo trae beforeAll.
    await page.getByPlaceholder('Buscar por nombre, apellido o CI...').fill(E2E_CI);
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.getByText(E2E_CI)).toBeVisible();

    await page.getByRole('button', { name: 'Editar' }).click();
    await page
      .getByPlaceholder('juan@email.com', { exact: true })
      .fill('e2e.editado@bomberos.bo');
    await page
      .getByPlaceholder('Prevención de Incendios', { exact: true })
      .fill('Especialidad editada');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Instructor actualizado')).toBeVisible();
    await expect(page.getByText('Especialidad editada')).toBeVisible();
    await expect(page.getByText('e2e.editado@bomberos.bo')).toBeVisible();

    // Desactivación (soft delete). afterAll lo reactiva vía API: no acumula
    // instructores inactivos entre corridas.
    await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Sí, desactivar' }).click();
    await expect(page.getByText('Instructor desactivado')).toBeVisible();
    await expect(page.getByText('Inactivo', { exact: true }).first()).toBeVisible();
  });

  test('14. ADMIN ve Instructores en solo lectura', async ({ page }) => {
    await login(page, ADMIN_CI);

    await expect(
      page.locator('aside nav a[href="/admin/sippci/capacitaciones/instructores"]'),
    ).toBeVisible();

    await page.goto('/admin/sippci/capacitaciones/instructores');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo instructor' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Desactivar' })).toHaveCount(0);
  });
});

test.describe('Capacitación — Aprobación de participantes', () => {
  test.beforeEach(async () => {
    await withApi(async (request) => {
      const headers = await apiAuth(request);
      await fijarEstadoParticipante(
        request,
        headers,
        PROG_RESULTADOS,
        PART_RESULTADOS,
        'INSCRITO',
      );
    });
  });

  test('15. Aprobar participante (INSCRITO → APROBADO, sin justificación)', async ({ page }) => {
    await login(page, GESTOR_CI);
    await abrirParticipantes(page, PROG_RESULTADOS);

    const fila = page.locator('table tbody tr', { hasText: 'Carlos Garcia' });
    await expect(fila).toHaveCount(1);
    await fila.getByRole('button', { name: 'Aprobar', exact: true }).click();

    // No debe abrirse el modal de justificación: el participante estaba INSCRITO.
    await expect(page.locator('#justificacion-participante')).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, aprobar' }).click();

    await expect(page.getByText('Participante aprobado')).toBeVisible();
    await expect(fila.getByText('APROBADO', { exact: true })).toBeVisible();
    await expect(fila.getByText('Aprobado', { exact: true })).toBeVisible();
  });

  test('16. Reprobar participante (INSCRITO → REPROBADO)', async ({ page }) => {
    await login(page, GESTOR_CI);
    await abrirParticipantes(page, PROG_RESULTADOS);

    const fila = page.locator('table tbody tr', { hasText: 'Carlos Garcia' });
    await expect(fila).toHaveCount(1);
    await fila.getByRole('button', { name: 'Reprobar', exact: true }).click();

    await expect(page.locator('#justificacion-participante')).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, reprobar' }).click();

    await expect(page.getByText('Participante reprobado')).toBeVisible();
    await expect(fila.getByText('REPROBADO', { exact: true })).toBeVisible();
    await expect(fila.getByText('Reprobado', { exact: true })).toBeVisible();
  });

  test('17. Corregir REPROBADO → APROBADO requiere justificación', async ({ page }) => {
    await withApi(async (request) => {
      const headers = await apiAuth(request);
      await fijarEstadoParticipante(
        request,
        headers,
        PROG_RESULTADOS,
        PART_RESULTADOS,
        'REPROBADO',
      );
    });

    await login(page, GESTOR_CI);
    await abrirParticipantes(page, PROG_RESULTADOS);

    const fila = page.locator('table tbody tr', { hasText: 'Carlos Garcia' });
    await fila.getByRole('button', { name: 'Aprobar', exact: true }).click();

    // Hay resultado previo: obliga a justificar antes de confirmar.
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('#justificacion-participante')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sí, aprobar' })).toHaveCount(0);

    await dialog.locator('#justificacion-participante').fill('corto');
    await dialog.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      dialog.getByText(/La justificación debe tener al menos 10 caracteres/),
    ).toBeVisible();

    await dialog
      .locator('#justificacion-participante')
      .fill('El instructor se equivoco en la calificacion');
    await dialog.getByRole('button', { name: 'Continuar' }).click();

    await page.getByRole('dialog').getByRole('button', { name: 'Sí, aprobar' }).click();
    await expect(page.getByText('Participante aprobado')).toBeVisible();
    await expect(fila.getByText('APROBADO', { exact: true })).toBeVisible();
    await expect(fila.getByText('El instructor se equivoco en la calificacion')).toBeVisible();
  });

  test('18. ADMIN no ve botones Aprobar/Reprobar', async ({ page }) => {
    await login(page, ADMIN_CI);
    await abrirParticipantes(page, PROG_RESULTADOS);

    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reprobar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Desinscribir' })).toHaveCount(0);
  });

  test('19. En PROGRAMADO no se pueden aprobar', async ({ page }) => {
    await login(page, GESTOR_CI);
    await abrirParticipantes(page, PROG_PROGRAMADA);

    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reprobar', exact: true })).toHaveCount(0);
    // Sí conserva la edición/inscripción propias de PROGRAMADO.
    await expect(
      page.getByRole('button', { name: 'Inscribir participante' }),
    ).toBeEnabled();
  });
});

test.describe('Capacitación — Certificados', () => {
  const CERTIFICADOS_API = '/api/admin/sippci/capacitaciones/certificados';
  // Carlos y Rosa: los dos inscritos de la programación FINALIZADO #2.
  const CI_APROBADOS = ['1000003', '1000006'];

  type InscripcionLista = {
    participanteId: number;
    certificadoId?: number | null;
    participante?: { id: number; ci: string; nombre: string; estado: string } | null;
  };

  async function participantePorCi(
    request: APIRequestContext,
    headers: AuthHeaders,
    ci: string,
  ) {
    const res = await request.get(
      `${PROGRAMACIONES_API}/${PROG_RESULTADOS}/participantes?limit=100`,
      { headers },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { items: InscripcionLista[] };
    const fila = body.items.find((i) => i.participante?.ci === ci);
    expect(fila, `CI ${ci} debe estar inscrita en la programación ${PROG_RESULTADOS}`).toBeTruthy();
    return fila as InscripcionLista;
  }

  // El API no permite re-emitir (409) ni revocar. El reinicio de certificados
  // lo hace `e2e/global-setup.ts` al arrancar la suite; aquí solo se deja a
  // los dos participantes APROBADOS para emitir.
  test.beforeAll(async () => {
    await withApi(async (request) => {
      const headers = await apiAuth(request);
      for (const ci of CI_APROBADOS) {
        const fila = await participantePorCi(request, headers, ci);
        await fijarEstadoParticipante(
          request,
          headers,
          PROG_RESULTADOS,
          fila.participanteId,
          'APROBADO',
        );
      }
    });
  });

  test('20. ADMIN no ve los botones de emisión de certificados', async ({ page }) => {
    await login(page, ADMIN_CI);
    await abrirParticipantes(page, PROG_RESULTADOS);

    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByTestId('emitir-certificado')).toHaveCount(0);
    await expect(page.getByTestId('emitir-lote')).toHaveCount(0);
  });

  test('21. GESTOR emite el certificado individual', async ({ page }) => {
    await login(page, GESTOR_CI);
    await abrirParticipantes(page, PROG_RESULTADOS);

    const fila = page.locator('table tbody tr', { hasText: 'Carlos Garcia' });
    await expect(fila).toHaveCount(1);
    await fila.getByTestId('emitir-certificado').click();

    await expect(page.getByText(/Certificado emitido: CERT-CAP-/)).toBeVisible({
      timeout: 20000,
    });
    // Ya emitido: la fila deja de ofrecer la emisión.
    await expect(fila.getByTestId('emitir-certificado')).toHaveCount(0);
  });

  test('22. GESTOR emite en lote a los aprobados restantes', async ({ page }) => {
    await login(page, GESTOR_CI);
    await abrirParticipantes(page, PROG_RESULTADOS);

    const botonLote = page.getByTestId('emitir-lote');
    await expect(botonLote).toBeVisible();
    await botonLote.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/aprobado\(s\) que aún no tienen certificado/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Sí, emitir' }).click();

    await expect(page.getByText(/Certificados emitidos: \d/)).toBeVisible({ timeout: 20000 });
    // No quedan pendientes: el botón global desaparece.
    await expect(page.getByTestId('emitir-lote')).toHaveCount(0);
  });

  test('23. Listado de certificados permite descargar el PDF', async ({ page }) => {
    await login(page, GESTOR_CI);
    await page.goto('/admin/sippci/capacitaciones/certificados');

    await expect(page.getByRole('heading', { name: 'Certificados Emitidos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    const filas = await page.locator('table tbody tr').count();
    expect(filas).toBeGreaterThanOrEqual(2);

    const [descarga] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/certificados/') && r.url().includes('/descargar'),
      ),
      page.getByTestId('descargar-pdf').first().click(),
    ]);
    expect(descarga.status()).toBe(200);
    expect(descarga.headers()['content-type'] ?? '').toContain('pdf');
    await expect(page.getByText('Certificado descargado')).toBeVisible();
  });

  test('24. Validación pública: código real y código inexistente', async ({
    page,
    request,
  }) => {
    const headers = await apiAuth(request);
    const res = await request.get(`${CERTIFICADOS_API}?limit=100`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { items: { codigo: string }[] };
    expect(body.items.length).toBeGreaterThan(0);
    const codigo = body.items[0].codigo;

    await page.goto(`/validar-certificado-capacitacion/${codigo}`);
    await expect(page.getByRole('heading', { name: 'Certificado Válido' })).toBeVisible();
    await expect(page.getByText(codigo)).toBeVisible();
    await expect(page.getByText('VIGENTE', { exact: true })).toBeVisible();

    await page.goto('/validar-certificado-capacitacion/CERT-CAP-9999-NOEXISTE');
    await expect(page.getByRole('heading', { name: 'Certificado No Válido' })).toBeVisible();
  });
});
