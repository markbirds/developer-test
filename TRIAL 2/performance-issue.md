# SQL Performance — Code Review Task

## Scenario

The page became slow, and you need find why.

## Schema

```sql
CREATE TABLE authors (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  author_id  INT NOT NULL REFERENCES authors(id),
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## The Code

```typescript
// Get the 50 most recent posts
const posts = await db.query(
  `SELECT id, author_id, title, created_at
   FROM posts
   ORDER BY created_at DESC
   LIMIT 50`
);

// Attach author info to each post
const postsWithAuthors = [];
for (const post of posts) {
  const author = await db.query(
    `SELECT id, name, email
     FROM authors
     WHERE id = ${post.author_id}`
  );
  postsWithAuthors.push({ ...post, author: author[0] });
}

return postsWithAuthors;
```

## Questions

1. **Identify the issue.** What performance problem does this code have?
2. **How you can fix.**
