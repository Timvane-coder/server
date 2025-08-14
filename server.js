const http = require('http');

const port = 80;
const host = '0.0.0.0';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from my Node.js server on DigitalOcean!\n');
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
