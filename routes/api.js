const express = require('express');
const router = express.Router();
const db = require('../src/db');
const bcrypt = require('bcryptjs');

// ─── Auth middleware ───
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ─── Auth ───
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username, '| ENV user:', process.env.ADMIN_USERNAME, '| ENV pass set:', !!process.env.ADMIN_PASSWORD);
  const envUser = process.env.ADMIN_USERNAME || 'admin';
  const envPass = process.env.ADMIN_PASSWORD || 'Latika2024';
  if (username === envUser && password === envPass) {
    req.session.user = { username };
    req.session.save((err) => {
      if (err) { console.error('Session save error:', err); return res.status(500).json({ error: 'Session error' }); }
      res.json({ ok: true });
    });
  } else {
    console.log('Login failed — expected:', envUser, '/', envPass, '| got:', username, '/', password);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// ─── Settings ───
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT key, value FROM settings');
    const settings = {};
    r.rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settings', requireAuth, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await db.query(
        'INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',
        [key, value]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Apartments ───
router.get('/apartments', requireAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM apartments ORDER BY name');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/apartments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, floor, rate_night, rate_week, rate_month, rate_type, max_guests, status, allow_expat, min_contract_months, notes } = req.body;
    await db.query(
      `UPDATE apartments SET name=$1,type=$2,floor=$3,rate_night=$4,rate_week=$5,rate_month=$6,
       rate_type=$7,max_guests=$8,status=$9,allow_expat=$10,min_contract_months=$11,notes=$12 WHERE id=$13`,
      [name, type, floor, rate_night, rate_week, rate_month, rate_type, max_guests, status, allow_expat, min_contract_months, notes, id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Guests ───
router.get('/guests', requireAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM guests ORDER BY last_name, first_name');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/guests', requireAuth, async (req, res) => {
  try {
    const { id, first_name, last_name, email, phone, country, id_num, lang, notes } = req.body;
    const gid = id || uid();
    await db.query(
      'INSERT INTO guests(id,first_name,last_name,email,phone,country,id_num,lang,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET first_name=$2,last_name=$3,email=$4,phone=$5,country=$6,id_num=$7,lang=$8,notes=$9',
      [gid, first_name, last_name, email||null, phone||null, country||null, id_num||null, lang||'en', notes||null]
    );
    res.json({ ok: true, id: gid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/guests/:id', requireAuth, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, country, id_num, lang, notes } = req.body;
    await db.query(
      'UPDATE guests SET first_name=$1,last_name=$2,email=$3,phone=$4,country=$5,id_num=$6,lang=$7,notes=$8 WHERE id=$9',
      [first_name, last_name, email||null, phone||null, country||null, id_num||null, lang||'en', notes||null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/guests/:id', requireAuth, async (req, res) => {
  try {
    const check = await db.query('SELECT id FROM reservations WHERE guest_id=$1 LIMIT 1', [req.params.id]);
    if (check.rows.length) return res.status(400).json({ error: 'Guest has existing reservations' });
    await db.query('DELETE FROM guests WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Reservations ───
router.get('/reservations', requireAuth, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT r.*, g.first_name, g.last_name, g.phone as guest_phone, g.email as guest_email,
             g.id_num, g.country, g.lang, a.name as apt_name, a.type as apt_type
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      LEFT JOIN apartments a ON r.apt_id = a.id
      ORDER BY r.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/reservations', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const rid = d.id || uid();
    // Conflict check
    const conflict = await db.query(
      `SELECT id FROM reservations WHERE apt_id=$1 AND status!='cancelled'
       AND NOT (checkout<=$2 OR checkin>=$3) AND id!=$4`,
      [d.apt_id, d.checkin, d.checkout, rid]
    );
    if (conflict.rows.length) return res.status(409).json({ error: 'Apartment already booked for those dates' });
    await db.query(
      `INSERT INTO reservations(id,apt_id,guest_id,checkin,checkout,rate,rate_type,total,nights,
        adults,children,status,source,notes,deposit_amount,deposit_status,deposit_note,
        employer,contract_duration,contract_start,contract_end,contract_ref)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT(id) DO UPDATE SET apt_id=$2,guest_id=$3,checkin=$4,checkout=$5,rate=$6,
        rate_type=$7,total=$8,nights=$9,adults=$10,children=$11,status=$12,source=$13,notes=$14,
        deposit_amount=$15,deposit_status=$16,deposit_note=$17,employer=$18,contract_duration=$19,
        contract_start=$20,contract_end=$21,contract_ref=$22`,
      [rid, d.apt_id, d.guest_id, d.checkin, d.checkout, d.rate, d.rate_type||'night',
       d.total, d.nights, d.adults||1, d.children||0, d.status||'confirmed',
       d.source||'direct', d.notes||null, d.deposit_amount||0, d.deposit_status||'not_collected',
       d.deposit_note||null, d.employer||null, d.contract_duration||null,
       d.contract_start||null, d.contract_end||null, d.contract_ref||null]
    );
    res.json({ ok: true, id: rid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/reservations/:id', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const conflict = await db.query(
      `SELECT id FROM reservations WHERE apt_id=$1 AND status!='cancelled'
       AND NOT (checkout<=$2 OR checkin>=$3) AND id!=$4`,
      [d.apt_id, d.checkin, d.checkout, req.params.id]
    );
    if (conflict.rows.length) return res.status(409).json({ error: 'Apartment already booked for those dates' });
    await db.query(
      `UPDATE reservations SET apt_id=$1,guest_id=$2,checkin=$3,checkout=$4,rate=$5,rate_type=$6,
        total=$7,nights=$8,adults=$9,children=$10,status=$11,source=$12,notes=$13,
        deposit_amount=$14,deposit_status=$15,deposit_note=$16,employer=$17,contract_duration=$18,
        contract_start=$19,contract_end=$20,contract_ref=$21 WHERE id=$22`,
      [d.apt_id, d.guest_id, d.checkin, d.checkout, d.rate, d.rate_type||'night',
       d.total, d.nights, d.adults||1, d.children||0, d.status, d.source||'direct',
       d.notes||null, d.deposit_amount||0, d.deposit_status||'not_collected',
       d.deposit_note||null, d.employer||null, d.contract_duration||null,
       d.contract_start||null, d.contract_end||null, d.contract_ref||null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/reservations/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM reservations WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Payments ───
router.get('/payments', requireAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM payments ORDER BY payment_date DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/payments', requireAuth, async (req, res) => {
  try {
    const { res_id, inv_id, amount, payment_date, method, note } = req.body;
    const pid = uid();
    await db.query(
      'INSERT INTO payments(id,res_id,inv_id,amount,payment_date,method,note) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [pid, res_id||null, inv_id||null, amount, payment_date, method||'Cash', note||null]
    );
    // Auto-mark invoice paid
    if (inv_id) {
      const paid = await db.query('SELECT SUM(amount) as total FROM payments WHERE inv_id=$1', [inv_id]);
      const inv = await db.query('SELECT total FROM invoices WHERE id=$1', [inv_id]);
      if (inv.rows.length && paid.rows[0].total >= inv.rows[0].total) {
        await db.query("UPDATE invoices SET status='paid' WHERE id=$1", [inv_id]);
      }
    }
    res.json({ ok: true, id: pid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Invoices ───
router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/invoices', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const iid = d.id || uid();
    const num = d.number || await nextInvNumber();
    await db.query(
      `INSERT INTO invoices(id,number,res_id,invoice_date,period_from,period_to,rent_label,rent,
        elec_on,elec_prev,elec_curr,elec_price,elec_amount,water_on,water_prev,water_curr,
        water_price,water_amount,extras,total,status,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT(id) DO UPDATE SET res_id=$3,invoice_date=$4,period_from=$5,period_to=$6,
        rent_label=$7,rent=$8,elec_on=$9,elec_prev=$10,elec_curr=$11,elec_price=$12,elec_amount=$13,
        water_on=$14,water_prev=$15,water_curr=$16,water_price=$17,water_amount=$18,extras=$19,
        total=$20,status=$21,notes=$22`,
      [iid, num, d.res_id||null, d.invoice_date, d.period_from||null, d.period_to||null,
       d.rent_label||'Monthly Rent', d.rent||0, d.elec_on||false, d.elec_prev||null,
       d.elec_curr||null, d.elec_price||null, d.elec_amount||0, d.water_on||false,
       d.water_prev||null, d.water_curr||null, d.water_price||null, d.water_amount||0,
       JSON.stringify(d.extras||[]), d.total||0, d.status||'draft', d.notes||null]
    );
    res.json({ ok: true, id: iid, number: num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/invoices/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Housekeeping ───
router.get('/housekeeping', requireAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM housekeeping');
    const hk = {};
    r.rows.forEach(row => hk[row.apt_id] = { status: row.status, assignedTo: row.assigned_to, note: row.note, updated: row.updated_at });
    res.json(hk);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/housekeeping/:aptId', requireAuth, async (req, res) => {
  try {
    const { status, assignedTo, note } = req.body;
    await db.query(
      `INSERT INTO housekeeping(apt_id,status,assigned_to,note,updated_at) VALUES($1,$2,$3,$4,NOW())
       ON CONFLICT(apt_id) DO UPDATE SET status=$2,assigned_to=$3,note=$4,updated_at=NOW()`,
      [req.params.aptId, status||'clean', assignedTo||null, note||null]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Maintenance ───
router.get('/maintenance', requireAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM maintenance ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/maintenance', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const mid = uid();
    const num = await nextMntNumber();
    await db.query(
      `INSERT INTO maintenance(id,number,apt_id,title,description,priority,status,assigned_to,cost,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [mid, num, d.apt_id, d.title, d.description||null, d.priority||'normal',
       d.status||'open', d.assigned_to||null, d.cost||0, d.notes||null]
    );
    res.json({ ok: true, id: mid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/maintenance/:id', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    await db.query(
      `UPDATE maintenance SET apt_id=$1,title=$2,description=$3,priority=$4,status=$5,
        assigned_to=$6,cost=$7,notes=$8 WHERE id=$9`,
      [d.apt_id, d.title, d.description||null, d.priority||'normal',
       d.status||'open', d.assigned_to||null, d.cost||0, d.notes||null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/maintenance/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM maintenance WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Helpers ───
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function nextInvNumber() {
  const r = await db.query('SELECT COUNT(*) FROM invoices');
  const n = parseInt(r.rows[0].count) + 1;
  return `INV-${new Date().getFullYear()}-${n.toString().padStart(4, '0')}`;
}

async function nextMntNumber() {
  const r = await db.query('SELECT COUNT(*) FROM maintenance');
  const n = parseInt(r.rows[0].count) + 1;
  return `MNT-${n.toString().padStart(3, '0')}`;
}

module.exports = router;
