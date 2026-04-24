// ============================================================
// Launchmen Task API
// Developer Candidate Test — Trial 2
// ============================================================
// Instructions:
//   Run with: npm install && node server.js
//   Server starts on: http://localhost:3000
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Test_2_task_ui.html'));
});

const DB_FILE = path.join(__dirname, 'Test_2_tasks.json');

const VALID_STATUSES = ['pending', 'done'];

function loadTasks() {
  if (!fs.existsSync(DB_FILE)) return [];
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveTasks(tasks) {
  fs.writeFileSync(DB_FILE, JSON.stringify(tasks, null, 2));
}

// GET /tasks
// Returns all tasks. Accepts an optional ?status= filter validated against VALID_STATUSES.
// Returns 400 with the list of accepted values if an unrecognised status is supplied.
app.get('/tasks', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.query;
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Accepted values: ${VALID_STATUSES.join(', ')}.`,
      });
    }
    const filtered = tasks.filter(t => t.status === status);
    return res.json({ success: true, tasks: filtered });
  }
  res.json({ success: true, tasks });
});

// POST /tasks
app.post('/tasks', (req, res) => {
  const { title, status } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'title is required' });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status "${status}". Accepted values: ${VALID_STATUSES.join(', ')}.`,
    });
  }
  const tasks = loadTasks();
  const newTask = {
    id: Date.now(),
    title: title,
    status: status || 'pending',
  };
  tasks.push(newTask);
  saveTasks(tasks);
  res.status(201).json({ success: true, task: newTask });
});

// PATCH /tasks/:id
app.patch('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status "${status}". Accepted values: ${VALID_STATUSES.join(', ')}.`,
    });
  }
  // IDs are stored as numbers (Date.now()), so coerce the route param before comparing.
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  task.status = status;
  saveTasks(tasks);
  res.json({ success: true, task });
});

// DELETE /tasks/:id
app.delete('/tasks/:id', (req, res) => {
  let tasks = loadTasks();
  // IDs are stored as numbers (Date.now()), so coerce the route param before comparing.
  const index = tasks.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  // splice() mutates the array in place and returns the removed elements,
  // so we operate on the original `tasks` array rather than reassigning.
  tasks.splice(index, 1);
  saveTasks(tasks);
  res.json({ success: true, message: 'Task deleted' });
});

app.listen(3000, () => {
  console.log('Launchmen Task API running on http://localhost:3000');
});

// ============================================================
// Task 3 — SQL Performance Review
// ============================================================

// ------------------------------------------------------------
// Q1: Identify the issue
// ------------------------------------------------------------
// The code has an N+1 query problem.
//
// One query fetches the 50 most recent posts, then the code
// enters a loop and fires a separate SELECT against the authors
// table for every single post. With 50 posts that is 51 round
// trips to the database (1 + 50). As the page load grows, or
// as the LIMIT increases, the number of queries scales linearly
// and response time grows accordingly.

// ------------------------------------------------------------
// Q2: How to fix it
// ------------------------------------------------------------
// Replace the loop with a single JOIN query that retrieves posts
// and their authors together in one round trip.
//
// Fixed query:
//
//   const postsWithAuthors = await db.query(
//     `SELECT
//        p.id,
//        p.title,
//        p.created_at,
//        a.id    AS author_id,
//        a.name  AS author_name,
//        a.email AS author_email
//      FROM posts p
//      JOIN authors a ON a.id = p.author_id
//      ORDER BY p.created_at DESC
//      LIMIT 50`
//   );
//
//   return postsWithAuthors.map(row => ({
//     id:         row.id,
//     title:      row.title,
//     created_at: row.created_at,
//     author: {
//       id:    row.author_id,
//       name:  row.author_name,
//       email: row.author_email,
//     },
//   }));
//
// This reduces 51 database round trips to 1 regardless of how
// many posts are returned.
