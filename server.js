require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Serve dynamic env to client
app.get('/env.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(`
window.__ENV__ = {
  SUPABASE_URL: '${process.env.SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}',
  BUCKET: '${process.env.SUPABASE_BUCKET}'
};
  `);
});

// Serve static front-end
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on http://localhost:${PORT}`));