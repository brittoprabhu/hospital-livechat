import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export default function UploadRoutes(pool, rootDir) {
  const router = express.Router();

  const uploadsDir = path.join(rootDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^\w.\-]/g, '_');
      cb(null, `${ts}_${safe}`);
    }
  });
  const upload = multer({ storage });

  router.post('/api/upload/:chatId', upload.single('file'), async (req, res) => {
    try {
      const { chatId } = req.params;
      const exists = await pool.query('SELECT id FROM conversations WHERE id=$1 LIMIT 1', [chatId]);
      if (!exists.rowCount) return res.status(404).json({ error: 'Invalid chatId' });

      const fileUrl = `/uploads/${req.file.filename}`;
      await pool.query(
        'INSERT INTO messages (chat_id, sender, file_url, file_name) VALUES ($1, $2, $3, $4)',
        [chatId, 'patient', fileUrl, req.file.originalname]
      );
      res.json({ ok: true, url: fileUrl });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Upload failed' }); }
  });

  return router;
}
