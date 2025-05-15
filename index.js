const http = require('http');
const url = require('url');
const { Client } = require('pg');
require('dotenv').config();


const PORT = process.env.PORT || 8080;

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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

const net = require('net');

const testConnection = () => {
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;

  if (!dbHost || !dbPort) {
    console.error("DB_HOST or DB_PORT is not defined.");
    return;
  }

  const socket = new net.Socket();
  socket.setTimeout(3000);

  socket.connect(dbPort, dbHost, () => {
    console.log(`Successfully connected to ${dbHost}:${dbPort}`);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.error(`Error connecting to ${dbHost}:${dbPort} - ${err.message}`);
  });

  socket.on('timeout', () => {
    console.error(`Connection to ${dbHost}:${dbPort} timed out`);
  });
};


testConnection();

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
