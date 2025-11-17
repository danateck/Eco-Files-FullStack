// ===== server.js - Backend מתוקן עם logging טוב יותר =====
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8787;

// ===== PostgreSQL Connection =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL error:', err.stack);
  } else {
    console.log('✅ PostgreSQL connected');
    release();
  }
});

// ===== Middleware =====
app.use(cors({
  origin: ['https://danateck.github.io'],
  credentials: true
}));
app.use(express.json());

// ===== Logging middleware =====
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  console.log('📋 Headers:', {
    'x-dev-email': req.headers['x-dev-email'],
    'authorization': req.headers.authorization ? 'Bearer ...' : 'none'
  });
  next();
});

// ===== File Upload =====
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ===== Helper: Get user from request =====
function getUserFromRequest(req) {
  // Dev mode - email in header (priority!)
  const devEmail = req.headers['x-dev-email'];
  if (devEmail) {
    const email = devEmail.toLowerCase().trim();
    console.log('✅ User from X-Dev-Email:', email);
    return email;
  }
  
  // Firebase token (future)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('⚠️ Firebase token found but not verified yet');
    // TODO: Verify token
  }
  
  console.log('❌ No user found in request');
  return null;
}

// ===== Create Tables =====
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        owner VARCHAR(255) NOT NULL,
        title VARCHAR(500),
        file_name VARCHAR(500),
        file_size BIGINT,
        mime_type VARCHAR(100),
        file_data BYTEA,
        category VARCHAR(100),
        year VARCHAR(10),
        org VARCHAR(255),
        recipient JSONB,
        shared_with JSONB,
        warranty_start VARCHAR(50),
        warranty_expires_at VARCHAR(50),
        auto_delete_after VARCHAR(50),
        uploaded_at BIGINT,
        last_modified BIGINT,
        last_modified_by VARCHAR(255),
        deleted_at BIGINT,
        deleted_by VARCHAR(255),
        trashed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_owner ON documents(owner);
      CREATE INDEX IF NOT EXISTS idx_shared ON documents USING GIN(shared_with);
      CREATE INDEX IF NOT EXISTS idx_trashed ON documents(trashed);
    `);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database init error:', error);
  }
}

initDB();

// ===== API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: Date.now(),
    database: pool ? 'connected' : 'disconnected'
  });
});

// Test auth endpoint
app.get('/api/test-auth', (req, res) => {
  const user = getUserFromRequest(req);
  res.json({
    authenticated: !!user,
    user: user,
    headers: {
      'x-dev-email': req.headers['x-dev-email'],
      'authorization': req.headers.authorization ? 'present' : 'missing'
    }
  });
});

// 1️⃣ GET /api/docs - Load documents
app.get('/api/docs', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      console.log('❌ Unauthorized: no user email');
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    console.log('📂 Loading docs for:', userEmail);

    const result = await pool.query(`
      SELECT 
        id, owner, title, file_name, file_size, mime_type,
        category, year, org, recipient, shared_with,
        warranty_start, warranty_expires_at, auto_delete_after,
        uploaded_at, last_modified, last_modified_by,
        deleted_at, deleted_by, trashed
      FROM documents
      WHERE owner = $1 
         OR shared_with ? $1
      ORDER BY uploaded_at DESC
    `, [userEmail]);

    console.log(`✅ Found ${result.rows.length} documents`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Load error:', error);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

// 2️⃣ POST /api/docs - Upload document
app.post('/api/docs', upload.single('file'), async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      console.log('❌ Upload unauthorized: no user');
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📤 Upload from:', userEmail);
    console.log('📄 File:', file.originalname, file.size, 'bytes');

    const id = require('crypto').randomUUID();
    const now = Date.now();
    
    const {
      title = file.originalname,
      category = 'אחר',
      year = new Date().getFullYear().toString(),
      org = '',
      recipient = '[]',
      warrantyStart,
      warrantyExpiresAt,
      autoDeleteAfter
    } = req.body;

    const recipientArray = JSON.parse(recipient || '[]');
    const sharedWith = [];

    await pool.query(`
      INSERT INTO documents (
        id, owner, title, file_name, file_size, mime_type, file_data,
        category, year, org, recipient, shared_with,
        warranty_start, warranty_expires_at, auto_delete_after,
        uploaded_at, last_modified, last_modified_by, trashed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
      id, userEmail, title, file.originalname, file.size, file.mimetype, file.buffer,
      category, year, org, JSON.stringify(recipientArray), JSON.stringify(sharedWith),
      warrantyStart || null, warrantyExpiresAt || null, autoDeleteAfter || null,
      now, now, userEmail, false
    ]);

    console.log(`✅ Uploaded: ${id}`);
    
    res.json({
      id,
      owner: userEmail,
      title,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_at: now
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// 3️⃣ GET /api/docs/:id/download - Download file
app.get('/api/docs/:id/download', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      SELECT file_data, file_name, mime_type, owner, shared_with
      FROM documents
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const doc = result.rows[0];
    const sharedWith = doc.shared_with || [];
    
    if (doc.owner !== userEmail && !sharedWith.includes(userEmail)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!doc.file_data) {
      return res.status(404).json({ error: 'No file data' });
    }

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.send(doc.file_data);
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// 4️⃣ PUT /api/docs/:id - Update document
app.put('/api/docs/:id', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { id } = req.params;
    const updates = req.body;

    const checkResult = await pool.query('SELECT owner FROM documents WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (checkResult.rows[0].owner !== userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['title', 'category', 'year', 'org', 'recipient', 'shared_with'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push(`last_modified = $${paramIndex}`);
    values.push(Date.now());
    paramIndex++;

    fields.push(`last_modified_by = $${paramIndex}`);
    values.push(userEmail);
    paramIndex++;

    values.push(id);

    await pool.query(`
      UPDATE documents
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    console.log(`✅ Updated: ${id}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// 5️⃣ PUT /api/docs/:id/trash - Move to/from trash
app.put('/api/docs/:id/trash', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { id } = req.params;
    const { trashed } = req.body;

    const result = await pool.query(`
      UPDATE documents
      SET trashed = $1, last_modified = $2, last_modified_by = $3
      WHERE id = $4 AND owner = $5
      RETURNING *
    `, [trashed, Date.now(), userEmail, id, userEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found or access denied' });
    }

    console.log(`✅ ${trashed ? 'Trashed' : 'Restored'}: ${id}`);
    res.json({ success: true, id, trashed });
  } catch (error) {
    console.error('❌ Trash error:', error);
    res.status(500).json({ error: 'Trash operation failed' });
  }
});

// 6️⃣ DELETE /api/docs/:id - Delete permanently
app.delete('/api/docs/:id', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM documents
      WHERE id = $1 AND owner = $2
      RETURNING id
    `, [id, userEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found or access denied' });
    }

    console.log(`✅ Deleted: ${id}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Ready to accept requests`);
});
