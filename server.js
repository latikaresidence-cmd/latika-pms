require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'latika-pms-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30*24*60*60*1000, httpOnly: true, secure: false, sameSite: 'lax' },
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRoutes);

app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  adminUser: process.env.ADMIN_USERNAME || 'admin (default)',
  adminPassSet: !!process.env.ADMIN_PASSWORD
}));

app.listen(PORT, () => {
  console.log('✅ Latika Residence PMS running on port ' + PORT);
  console.log('👤 Admin: ' + (process.env.ADMIN_USERNAME || 'admin'));
  console.log('🔑 Password set: ' + !!process.env.ADMIN_PASSWORD);
});
