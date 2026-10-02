-- Segunda parte de la reconciliación (ver 20261002153028_reconcile_companero_flow).
-- El DEFAULT usa 'PENDIENTE', valor creado en la migración anterior: Postgres
-- (error 55P04) no permite usar un valor nuevo de enum en la misma
-- transacción donde se creó con ADD VALUE, por eso va separado.
ALTER TABLE "participantes_cursos" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
