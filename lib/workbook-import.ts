import retiredIds from './workbook-retired-ids.json';

// Replace only superseded workbook rows, once. Keep a recovery copy of overrides;
// custom entries, current workbook overrides, cancellation and audit history remain untouched.
export async function applyWorkbookImport(db:D1Database){
 const key='flat-workbook-2026-10-01-v2';
 if(await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first())return;
 await db.batch([
  db.prepare("INSERT OR IGNORE INTO settings(key,value) SELECT ?,COALESCE(json_group_array(json_object('id',id,'day',day,'department',department,'level',level,'start',start,'end',end,'course',course,'instructor',instructor,'room',room,'groupName',group_name,'kind',kind,'source',source)),'[]') FROM entries").bind(key+'-previous-overrides'),
  db.prepare('DELETE FROM entries WHERE id IN (SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM settings WHERE key=?)').bind(JSON.stringify(retiredIds),key),
  db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)').bind(key,'applied')
 ]);
}
