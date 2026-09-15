import Database from 'better-sqlite3';
const db = new Database('data/database.sqlite');
const rows = db.prepare('SELECT id, name, parentId FROM categories').all();
console.log(rows);
