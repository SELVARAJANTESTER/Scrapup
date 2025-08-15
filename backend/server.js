import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-2024';

let db;
async function initDb() {
  db = await open({filename: ':memory:', driver: sqlite3.Database});
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, 
      first_name TEXT, last_name TEXT, role TEXT
    );
    CREATE TABLE pickup_requests (
      id INTEGER PRIMARY KEY, customer_id INTEGER, description TEXT, 
      address TEXT, latitude REAL, longitude REAL, status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  const hash = await bcrypt.hash('demo123', 10);
  await db.run('INSERT INTO users VALUES (1,?,?,?,?,?)', ['customer@demo.com',hash,'John','Customer','customer']);
  await db.run('INSERT INTO users VALUES (2,?,?,?,?,?)', ['dealer@demo.com',hash,'Mike','Dealer','dealer']);
  await db.run('INSERT INTO users VALUES (3,?,?,?,?,?)', ['admin@demo.com',hash,'Sarah','Admin','admin']);
}

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-vercel-app.vercel.app'  // Replace with your actual Vercel URL
  ],
  credentials: true
}));

app.use(express.json());

function auth(req,res,next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({error: 'No token'});
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({error: 'Invalid token'}); }
}

app.get('/', (req,res) => res.json({message: '🚀 Scrap Pickup API', demo: 'customer@demo.com / demo123'}));

app.post('/api/auth/login', async (req,res) => {
  const {email, password} = req.body;
  const user = await db.get('SELECT * FROM users WHERE email=?', [email]);
  if (!user || !await bcrypt.compare(password, user.password_hash)) 
    return res.status(401).json({error: 'Invalid credentials'});
  
  const token = jwt.sign({id: user.id, role: user.role}, JWT_SECRET, {expiresIn: '24h'});
  res.json({
    user: {id:user.id, email, firstName:user.first_name, lastName:user.last_name, role:user.role},
    tokens: {accessToken: token, expiresIn: 86400}
  });
});

app.post('/api/auth/register', async (req,res) => {
  const {email, password, firstName, lastName, role} = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (email,password_hash,first_name,last_name,role) VALUES (?,?,?,?,?)',
      [email, hash, firstName, lastName, role]);
    const token = jwt.sign({id: result.lastID, role}, JWT_SECRET, {expiresIn: '24h'});
    res.json({
      user: {id: result.lastID, email, firstName, lastName, role},
      tokens: {accessToken: token, expiresIn: 86400}
    });
  } catch { res.status(409).json({error: 'User exists'}); }
});

app.get('/api/requests', auth, async (req,res) => {
  const query = req.user.role === 'customer' 
    ? 'SELECT * FROM pickup_requests WHERE customer_id=? ORDER BY created_at DESC'
    : 'SELECT * FROM pickup_requests ORDER BY created_at DESC';
  const params = req.user.role === 'customer' ? [req.user.id] : [];
  const requests = await db.all(query, params);
  res.json({data: requests});
});

app.post('/api/requests', auth, async (req,res) => {
  if (req.user.role !== 'customer') return res.status(403).json({error: 'Only customers'});
  const {description, address, latitude, longitude} = req.body;
  const result = await db.run('INSERT INTO pickup_requests (customer_id,description,address,latitude,longitude) VALUES (?,?,?,?,?)',
    [req.user.id, description, address, latitude, longitude]);
  res.json({id: result.lastID, description, address, status: 'new'});
});

app.put('/api/requests/:id/status', auth, async (req,res) => {
  await db.run('UPDATE pickup_requests SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({success: true});
});

initDb().then(() => app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`)));

