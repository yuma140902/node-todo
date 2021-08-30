'use strict'
const express = require('express')

let todos = [
  { id: 1, title: 'ネーム', completed: false },
  { id: 2, title: '下書き', completed: true }
]

const app = express();
app.use(express.json());

app.get('/api/todos', (req, res) => {
  if (!req.query.completed) {
    return res.json(todos);
  }

  // クエリパラメータcompletedが指定された場合はフィルタリング
  const completed = (req.query.completed === 'true');
  res.json(todos.filter(todo => todo.completed === completed));
});

let id = 2;

app.post('/api/todos', (req, res, next) => {
  const { title } = req.body;
  if (typeof title !== 'string' || !title) {
    // titleがリクエストに含まれない場合は400 Bad Request
    const err = new Error('title is required');
    err.statusCode = 400;
    return next(err);
  }

  /* todoリストへ追加 */
  const todo = { id: ++id, title, completed: false };
  todos.push(todo);

  res.status(201).json(todo);
});

// req.todoをセットするミドルウェア
app.use('/api/todos/:id(\\d+)', (req, res, next) => {
  req.todo = todos.find(todo => todo.id == req.params.id);
  if (req.todo) {
    return next();
  }
  const err = new Error('No task found');
  err.statusCode = 405;
  next(err);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message });
});

app.route('/api/todos/:id(\\d+)/completed')
  .put((req, res) => {
    req.todo.completed = true;
    res.json(req.todo);
  })
  .delete((req, res) => {
    req.todo.completed = false;
    res.json(req.todo);
  });

app.route('/api/todos/:id(\\d+)')
  .get((req, res) => res.json(req.todo))
  .delete((req, res) => {
    todos = todos.filter(todo => todo !== req.todo);
    res.statusCode(204).end();
  });

app.listen(3000);

// Next.jsによるルーティング
const next = require('next')
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });

nextApp.prepare().then(
  () => app.get('*', nextApp.getRequestHandler()),
  err => {
    console.error(err);
    process.exit(1);
  }
);