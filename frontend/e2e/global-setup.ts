import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Se ejecuta UNA vez antes de toda la suite (`playwright.config.ts > globalSetup`).
 *
 * Re-carga los fixtures de capacitación para que cada corrida empiece igual:
 * - programaciones en su estado fixture (#2 FINALIZADO, #4 PROGRAMADO, …)
 * - participantes en su estado fixture (INSCRITO/REPROBADO/APROBADO)
 * - borra los certificados emitidos por la corrida anterior y reinicia
 *   `certificadoEmitido` (la API no permite re-emitir ni revocar).
 *
 * Sin este paso, la corrida N+1 falla en los tests 15-19 (no se puede
 * modificar un participante con certificado) y en 20-24 (409 al emitir).
 */
function resolverBackend(): string {
  const cwd = process.cwd();
  const candidatos = [
    cwd,
    path.resolve(cwd, 'backend'),
    path.resolve(cwd, '../backend'),
  ];
  const dir = candidatos.find((d) =>
    fs.existsSync(path.join(d, 'prisma', 'seed-capacitaciones-completo.ts')),
  );
  if (!dir) {
    throw new Error('No se encontró backend/prisma/seed-capacitaciones-completo.ts');
  }
  return dir;
}

export default async function globalSetup() {
  const backend = resolverBackend();
  console.log(`\n[e2e:globalSetup] Recargando fixtures desde ${backend}`);
  execSync('npx ts-node prisma/seed-capacitaciones-completo.ts', {
    cwd: backend,
    stdio: 'ignore',
    shell: true,
    timeout: 180000,
  });
  console.log(`[e2e:globalSetup] Fixtures listos — ${new Date().toISOString()}\n`);
}
