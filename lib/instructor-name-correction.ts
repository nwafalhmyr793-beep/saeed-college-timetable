export async function applyInstructorNameCorrection(db: D1Database) {
  const key='instructor-abdulsalam-spacing-2026-09-30';
  if(await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first())return;
  await db.batch([
    db.prepare("UPDATE entries SET instructor=replace(instructor,?,?) WHERE source <> 'deleted' AND instr(instructor,?)>0 AND NOT EXISTS(SELECT 1 FROM settings WHERE key=?)").bind('عبدالسالم','عبد السلام','عبدالسالم',key),
    db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)').bind(key,'applied')
  ]);
}
