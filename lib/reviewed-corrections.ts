import corrections from '../reviewed-corrections.json';

const importKey = 'reviewed-excel-2026-09-30-v1';
const columns: Record<string,string> = {course:'course',instructor:'instructor',room:'room',groupName:'group_name',day:'day',start:'start',end:'end'};

// Apply the approved workbook once to persisted overrides as well as the seed.
// Compare each field against its exported value so intervening edits survive.
export async function applyReviewedCorrections(db: D1Database) {
  if(await db.prepare('SELECT value FROM settings WHERE key=?').bind(importKey).first())return;
  const rows=await db.prepare("SELECT * FROM entries WHERE source <> 'deleted'").all<Record<string,unknown>>();
  const stored=new Map(rows.results.map(row=>[String(row.id),row]));
  const statements: D1PreparedStatement[]=[];
  for(const patch of corrections){
    const row=stored.get(patch.id);if(!row)continue;
    const assignments:string[]=[];const values:(string|number)[]=[];
    for(const [field,change] of Object.entries(patch.changes)){
      const column=columns[field];if(!column||!change||row[column]!==change.before)continue;
      assignments.push(`${column}=CASE WHEN ${column}=? THEN ? ELSE ${column} END`);
      values.push(change.before,change.after);
    }
    if(assignments.length)statements.push(db.prepare(`UPDATE entries SET ${assignments.join(',')} WHERE id=? AND source <> 'deleted' AND NOT EXISTS(SELECT 1 FROM settings WHERE key=?)`).bind(...values,patch.id,importKey));
  }
  statements.push(db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)').bind(importKey,'applied'));
  await db.batch(statements);
}
