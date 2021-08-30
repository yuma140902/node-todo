'use strict'
const { promisify } = require('util')
const { join } = require('path');
const sqlite3 = process.env.NODE_ENT === 'production'
  ? require('sqlite3')
  : require('sqlite3').verbose();

const db = new sqlite3.Database(join(__dirname, 'sqlite'));

// Sqlite3 の API を Promisify する
const dbGet = promisify(db.get.bind(db));
const dbRun = function () {
  return new Promise((resolve, reject) =>
    db.run.apply(db, [
      ...arguments,
      function (err) {
        err ? reject(err) : resolve(this)
      }
    ])
  )
}
const dbAll = promisify(db.all.bind(db));

// テーブルを作る
dbRun(`CREATE TABLE IF NOT EXISTS todo (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL
)`).catch(err => {
  console.error(err);
  process.exit(1);
});

function rowToTodo(row) {
  return { ...row, completed: !!row.completed }
}

/* --- 以下 API --- */
exports.fetchAll = () =>
  dbAll('SELECT * FROM todo').then(rows => rows.map(rowToTodo))

exports.fetchByCompleted = completed =>
  dbAll('SELECT * FROM todo WHERE completed = ?', completed)
    .then(rows => rows.map(rowToTodo))

exports.create = async todo => {
  await dbRun(
    'INSERT INTO todo VALUES (?, ?, ?)',
    todo.id,
    todo.title,
    todo.completed
  );
}

exports.update = (id, update) => {
  const setColumns = [];
  const values = [];
  for (const column of ['title', 'completed']) {
    if (column in update) {
      setColumns.push(`${column} = ?`);
      values.push(update[column]);
    }
  }
  values.push(id);
  return dbRun(`UPDATE todo SET ${setColumns.join()} WHERE id = ?`, values)
    .then(({ changes }) => changes === 1
      ? dbGet('SELECT * FROM todo WHERE id = ?', id).then(rowToTodo)
      : null
    );
}

exports.remove = id => dbRun('DELETE FROM todo WHERE id = ?')
  .then(({ changes }) => changes === 1 ? id : null)