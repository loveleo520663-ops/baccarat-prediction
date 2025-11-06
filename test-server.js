const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('測試伺服器運行正常！');
});

server.listen(3000, '127.0.0.1', () => {
  console.log('測試伺服器運行在 http://127.0.0.1:3000');
});

server.on('error', (err) => {
  console.error('伺服器錯誤:', err);
});