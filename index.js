const express = require('express');
const path = require('path');

const app = express();
const port = 3000;
app.use((req, res, next) => {
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});
app.use('/', express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
