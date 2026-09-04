require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Performance ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
    },
  },
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Sessions (memory-based for simplicity) ───
app.use(session({
  secret: process.env.SESSION_SECRET || 'latika-pms-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30*24*60*60*1000, httpOnly: false, secure: true, sameSite: 'none' },
}));

// ─── Static files ───
app.use(express.static(path.join(__dirname, 'public')));

// ─── API routes ───
app.use('/api', apiRoutes);

// ─── Login page ───
app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ─── Main app — protected ───
app.get('/', (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// ─── Health check ───
app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  user: process.env.ADMIN_USERNAME || 'admin (default)'
}));

// ─── Start ───
app.listen(PORT, () => {
  console.log(`✅ Latika Residence PMS running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`👤 Admin user: ${process.env.ADMIN_USERNAME || 'admin (default)'}`);
});
