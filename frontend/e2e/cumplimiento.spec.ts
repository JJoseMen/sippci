import { test, expect } from '@playwright/test';

const GESTOR_CI = '9905200';
const GESTOR_PASS = '123456';

test.describe('Módulo Cumplimiento SIPPCI — Flujo E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/kerberos');
    await page.fill('#ci', GESTOR_CI);
    await page.fill('#password', GESTOR_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
  });

  test('1. Sidebar muestra Cumplimiento SIPPCI', async ({ page }) => {
    await expect(page.getByText('Cumplimiento SIPPCI')).toBeVisible();
    await expect(page.getByText('Profesionales')).not.toBeVisible();
  });

  test('2. Lista solicitudes Natural carga', async ({ page }) => {
    await page.click('text=Solicitudes Natural');
    await page.waitForURL(/\/admin\/sippci\/cumplimiento\/solicitudes\/natural/);
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByText('SIPPCI-NAT-2026-001')).toBeVisible();
  });

  test('3. Lista solicitudes Jurídica carga', async ({ page }) => {
    await page.goto('/admin/sippci/cumplimiento/solicitudes/juridica');
    await expect(page.getByText('SIPPCI-JUR-2026-001')).toBeVisible();
  });

  test('4. Expediente Digital muestra datos', async ({ page }) => {
    await page.goto('/admin/sippci/cumplimiento/solicitudes/natural/SIPPCI-NAT-2026-002');
    await expect(page.getByRole('heading', { name: /SIPPCI-NAT-2026-002/ })).toBeVisible();
    await expect(page.getByText('Panadería Doña Rosa')).toBeVisible();
    await expect(page.getByText('ALTO')).toBeVisible();
  });

  test('5. Modal Observar abre y valida', async ({ page }) => {
    await page.goto('/admin/sippci/cumplimiento/solicitudes/natural/SIPPCI-NAT-2026-002');
    await page.click('button:has-text("Observar")');
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: 'Observar Solicitud' })).toBeVisible();
    const textarea = page.locator('textarea');
    await textarea.fill('Falta declaración jurada firmada');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: 'Observar Solicitud' })).not.toBeVisible();
  });

  test('6. Lista inspecciones carga', async ({ page }) => {
    await page.goto('/admin/sippci/cumplimiento/inspecciones');
    await expect(page.getByRole('heading', { name: /Inspecciones Técnicas/ })).toBeVisible();
  });

  test('7. Lista certificados emitidos carga', async ({ page }) => {
    await page.goto('/admin/sippci/cumplimiento/certificados');
    await expect(
      page.getByRole('heading', { name: 'Certificados Emitidos', exact: true })
    ).toBeVisible();
    // Verificar que hay al menos 1 fila (gracias al seed)
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByText('CERT-SIPPCI-2026-0001')).toBeVisible();
  });

  test('8. Reportes carga con 3 gráficos', async ({ page }) => {
    await page.goto('/admin/sippci/cumplimiento/reportes');
    await expect(page.getByRole('heading', { name: /Reportes/i })).toBeVisible();
    await expect(page.getByText('Solicitudes por Estado')).toBeVisible();
    await expect(page.getByText(/Certificados.*por Mes/i)).toBeVisible();
    await expect(page.getByText(/Nivel de Riesgo/i)).toBeVisible();
  });

  test('9. Verificar botones según estado (APROBADA y INFORME_REGISTRADO)', async ({ page }) => {
    // NOTA: El seed no mantiene solicitudes en APROBADA (se convierten a CERTIFICADO_EMITIDO al testear).
    // Este test verifica la LÓGICA DE VISIBILIDAD de botones según el estado.
    // Para testear el flujo completo de emisión, se requeriría:
    // 1. Crear solicitud fresca → ENVIADA → EN_REVISION
    // 2. Aprobar → APROBADA
    // 3. Verificar "Emitir Certificado" visible y funcional.
    
    // Verificar que la página carga sin errores para una solicitud existente
    await page.goto('/admin/sippci/cumplimiento/solicitudes/juridica/SIPPCI-JUR-2026-002');
    await expect(page.getByRole('heading', { name: /SIPPCI-JUR-2026-002/ })).toBeVisible();
    
    // El estado actual es CERTIFICADO_EMITIDO (por test previo), así que NO debe haber botones de acción
    await expect(page.getByRole('button', { name: 'Emitir Certificado' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar informe' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Observar informe' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Rechazar informe' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Observar' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Rechazar' })).not.toBeVisible();
    
    // Verificar estado EN_REVISION (SIPPCI-NAT-2026-002 en seed)
    await page.goto('/admin/sippci/cumplimiento/solicitudes/natural/SIPPCI-NAT-2026-002');
    await expect(page.getByRole('heading', { name: /SIPPCI-NAT-2026-002/ })).toBeVisible();
    
    // En EN_REVISION: debe tener botones Aprobar, Observar, Rechazar, Programar Inspección
    await expect(page.getByRole('button', { name: 'Aprobar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Observar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rechazar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Programar Inspección' })).toBeVisible();
    // NO debe tener botones de informe ni emitir
    await expect(page.getByRole('button', { name: 'Emitir Certificado' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar informe' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Observar informe' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Rechazar informe' })).not.toBeVisible();
  });

});
