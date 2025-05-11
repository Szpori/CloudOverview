const http = require('http');
const url = require('url');
const { Client } = require('pg');

const PORT = process.env.PORT || 8080;

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'myrootpassword',
  database: 'my-database',
});

client.connect()
  .then(() => console.log('Connected to DB'))
  .catch(err => console.error('Connection error', err.stack));

// Create items table if not exists
client.query(`
  CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  );
`).catch(err => console.error('Error creating table:', err.stack));

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && pathname === '/items') {
      try {
        const result = await client.query('SELECT * FROM items');
        res.end(JSON.stringify(result.rows));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    else if (req.method === 'POST' && pathname === '/items') {
      try {
        const { name } = JSON.parse(body);
        if (!name) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Name is required" }));
          return;
        }

        const result = await client.query(
          'INSERT INTO items (name) VALUES ($1) RETURNING *',
          [name]
        );
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    else if (req.method === 'GET' && pathname.startsWith('/items/')) {
      const id = pathname.split('/')[2];
      try {
        const result = await client.query('SELECT * FROM items WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Item not found" }));
        } else {
          res.end(JSON.stringify(result.rows[0]));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    else if (req.method === 'DELETE' && pathname.startsWith('/items/')) {
      const id = pathname.split('/')[2];
      try {
        const result = await client.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Item not found" }));
        } else {
          res.end(JSON.stringify({ message: `Item ${id} deleted` }));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
