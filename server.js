// ===== server.js - Backend מלא ל-Render =====
// התקנה: npm install express cors multer pg dotenv
// הרצה: node server.js

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

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL');
    release();
  }
});

// ===== Middleware =====
app.use(cors({
  origin: ['https://danateck.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// ===== File Upload Configuration =====
const storage = multer.memoryStorage(); // Store files in memory (or use diskStorage for local files)
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ===== Helper: Get user from request =====
function getUserFromRequest(req) {
  // Option 1: Firebase token (production)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // TODO: Verify Firebase token here
    // const token = authHeader.substring(7);
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // return decodedToken.email;
  }
  
  // Option 2: Dev mode - email in header
  const devEmail = req.headers['x-dev-email'];
  if (devEmail) {
    return devEmail.toLowerCase().trim();
  }
  
  return null;
}

// ===== Create Tables (run once) =====
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
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

initDB();

// ===== API ENDPOINTS =====

// 1️⃣ GET /api/docs - Load all documents for user
app.get('/api/docs', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error loading docs:', error);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

// 2️⃣ POST /api/docs - Upload new document
app.post('/api/docs', upload.single('file'), async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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

    console.log(`✅ Document uploaded: ${id} by ${userEmail}`);
    
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
    console.error('❌ Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// 3️⃣ GET /api/docs/:id/download - Download file
app.get('/api/docs/:id/download', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      SELECT file_data, file_name, mime_type, owner, shared_with
      FROM documents
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    
    // Check permissions
    const sharedWith = doc.shared_with || [];
    if (doc.owner !== userEmail && !sharedWith.includes(userEmail)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!doc.file_data) {
      return res.status(404).json({ error: 'File data not found' });
    }

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.send(doc.file_data);
  } catch (error) {
    console.error('❌ Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// 4️⃣ PUT /api/docs/:id - Update document metadata
app.put('/api/docs/:id', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const checkResult = await pool.query('SELECT owner FROM documents WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
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
      return res.status(400).json({ error: 'No valid fields to update' });
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

    console.log(`✅ Document updated: ${id}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error('❌ Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// 5️⃣ PUT /api/docs/:id/trash - Move to/from trash
app.put('/api/docs/:id/trash', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
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
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    console.log(`✅ Document ${trashed ? 'trashed' : 'restored'}: ${id}`);
    res.json({ success: true, id, trashed });
  } catch (error) {
    console.error('❌ Error updating trash status:', error);
    res.status(500).json({ error: 'Failed to update trash status' });
  }
});

// 6️⃣ DELETE /api/docs/:id - Permanently delete
app.delete('/api/docs/:id', async (req, res) => {
  try {
    const userEmail = getUserFromRequest(req);
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM documents
      WHERE id = $1 AND owner = $2
      RETURNING id
    `, [id, userEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    console.log(`✅ Document permanently deleted: ${id}`);
    res.json({ success: true, id });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ===== Health check =====
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: Date.now() });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
