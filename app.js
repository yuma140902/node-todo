'use strict'
const express = require('express')
const { v4: uuidv4 } = require('uuid')
// npm_lifecycle_event は、npm run hoge の hoge の部分
const dataStorage = require(`./${process.env.npm_lifecycle_event}`)

const app = express();

app.use(express.json());

// ToDo一覧の取得
app.get('/api/todos', (req, res) => {
  if (!req.query.completed) {
    // すべての一覧
    return dataStorage.fetchAll().then(todos => res.json(todos), next);
  }

  // クエリパラメータcompletedが指定された場合はフィルタリング
  const completed = (req.query.completed === 'true');
  dataStorage.fetchByCompleted(completed).then(todos => res.json(todos), next);
});

// ToDoの新規登録
app.post('/api/todos', (req, res, next) => {
  const { title } = req.body;
  if (typeof title !== 'string' || !title) {
    // titleがリクエストに含まれない場合は400 Bad Request
    const err = new Error('title is required');
    err.statusCode = 400;
    return next(err);
  }

  /* todoリストへ追加 */
  const todo = { id: uuidv4(), title, completed: false };
  dataStorage.create(todo).then(() => res.status(201).json(todo), next);
});

function completedHandler(completed) {
  return (req, res, next) =>
    dataStorage.update(req.params.id, { completed: completed })
      .then(todo => {
        if (todo) {
          return res.json(todo);
        } const err = new Error('ToDo is not found');
        err.statusCode = 404;
        next(err)
      }, next)
}

// ToDoのCompletedの設定、解除
app.route('/api/todos/:id/completed')
  .put(completedHandler(true))
  .delete(completedHandler(false));

// ToDoの削除
app.delete('/api/todos/:id', (req, res, next) =>
  dataStorage.remove(req.params.id).then(id => {
    if (id !== null) {
      return res.status(204).end();
    }
    const err = new Error('ToDo not found');
    err.statusCode = 404;
    next(err)
  }, next)
);

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message });
});

app.listen(3000);
