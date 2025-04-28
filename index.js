const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello from Node.js HTTP server! Updated 5\n');
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
