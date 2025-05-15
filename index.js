const http = require('http');
const url = require('url');
const { Client } = require('pg');

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

// Create quotes table if not exists
client.query(`
  CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote TEXT NOT NULL,
    author TEXT NOT NULL,
    year INT,
    category TEXT
  );
`).catch(err => console.error('Error creating table:', err.stack));

const testConnection = async () => {
  try {
    await client.query('SELECT 1');
    console.log('Test connection successful.');
  } catch (err) {
    console.error('Test connection failed:', err.message);
  }
};

testConnection();

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    res.setHeader('Content-Type', 'application/json');

    // GET /quotes - Get all quotes
    if (req.method === 'GET' && pathname === '/quotes') {
      try {
        const result = await client.query('SELECT * FROM quotes');
        res.end(JSON.stringify(result.rows));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    // POST /quotes - Add a new quote
    else if (req.method === 'POST' && pathname === '/quotes') {
      try {
        const { quote, author, year, category } = JSON.parse(body);

        if (!quote || !author) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Quote and author are required" }));
          return;
        }

        const result = await client.query(
          'INSERT INTO quotes (quote, author, year, category) VALUES ($1, $2, $3, $4) RETURNING *',
          [quote, author, year || null, category || null]
        );
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    // GET /quotes/:id - Get a specific quote
    else if (req.method === 'GET' && pathname.startsWith('/quotes/')) {
      const id = pathname.split('/')[2];
      try {
        const result = await client.query('SELECT * FROM quotes WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Quote not found" }));
        } else {
          res.end(JSON.stringify(result.rows[0]));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    // DELETE /quotes/:id - Delete a specific quote
    else if (req.method === 'DELETE' && pathname.startsWith('/quotes/')) {
      const id = pathname.split('/')[2];
      try {
        const result = await client.query('DELETE FROM quotes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Quote not found" }));
        } else {
          res.end(JSON.stringify({ message: `Quote ${id} deleted` }));
        }
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }

    // Default 404 for other routes
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
