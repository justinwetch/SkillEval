import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

function nowIso() {
  return new Date().toISOString();
}

function runNameFromPayload(payload) {
  const skillA = payload?.config?.skillA?.filename || 'Skill A';
  const skillB = payload?.config?.skillB?.filename || 'Skill B';
  return `${skillA} vs ${skillB}`;
}

function summarizePayload(payload) {
  const evaluations = Array.isArray(payload?.evaluations) ? payload.evaluations : [];
  return {
    skillAName: payload?.config?.skillA?.filename || 'Skill A',
    skillBName: payload?.config?.skillB?.filename || 'Skill B',
    promptCount: payload?.config?.prompts?.length || evaluations.length,
    generatedCount: evaluations.filter((ev) => (
      ev?.resultA?.status === 'complete' && ev?.resultB?.status === 'complete'
    )).length,
    judgedCount: evaluations.filter((ev) => ev?.judge?.status === 'complete').length,
  };
}

export function createRunHistoryStore(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_runs_updated_at ON runs(updated_at DESC);
  `);

  const insertRun = db.prepare(`
    INSERT INTO runs (id, name, status, created_at, updated_at, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateRun = db.prepare(`
    UPDATE runs
    SET name = ?, status = ?, updated_at = ?, payload = ?
    WHERE id = ?
  `);
  const listRunsStmt = db.prepare(`
    SELECT id, name, status, created_at, updated_at, payload
    FROM runs
    ORDER BY updated_at DESC
  `);
  const getRunStmt = db.prepare(`
    SELECT id, name, status, created_at, updated_at, payload
    FROM runs
    WHERE id = ?
  `);
  const deleteRunStmt = db.prepare('DELETE FROM runs WHERE id = ?');

  function rowToRun(row, includePayload = false) {
    if (!row) return null;
    const payload = JSON.parse(row.payload);
    const summary = summarizePayload(payload);
    const run = {
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...summary,
    };
    if (includePayload) {
      run.payload = payload;
    }
    return run;
  }

  return {
    create(payload = {}, name) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();
      const status = payload.status || 'idle';
      const runName = name || payload.name || runNameFromPayload(payload);

      insertRun.run(
        id,
        runName,
        status,
        timestamp,
        timestamp,
        JSON.stringify({ ...payload, runId: id, name: runName, createdAt: timestamp, updatedAt: timestamp }),
      );

      return rowToRun(getRunStmt.get(id), true);
    },

    update(id, payload = {}, name) {
      const existing = rowToRun(getRunStmt.get(id), true);
      if (!existing) return null;

      const timestamp = nowIso();
      const runName = name || payload.name || existing.name || runNameFromPayload(payload);
      const status = payload.status || existing.status || 'idle';
      const nextPayload = {
        ...payload,
        runId: id,
        name: runName,
        createdAt: existing.createdAt,
        updatedAt: timestamp,
      };

      updateRun.run(runName, status, timestamp, JSON.stringify(nextPayload), id);
      return rowToRun(getRunStmt.get(id), true);
    },

    list() {
      return listRunsStmt.all().map((row) => rowToRun(row, false));
    },

    get(id) {
      return rowToRun(getRunStmt.get(id), true);
    },

    delete(id) {
      const result = deleteRunStmt.run(id);
      return result.changes > 0;
    },

    close() {
      db.close();
    },
  };
}
