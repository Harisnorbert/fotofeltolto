import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const upload = multer();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const BUCKET = process.env.SUPABASE_BUCKET;

app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    for (const file of req.files) {
      let buffer = file.buffer;
      let filename = file.originalname;
      let contentType = file.mimetype;

      // If HEIC, convert to JPEG
      if (/\.heic$/i.test(filename)) {
        buffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
        filename = filename.replace(/\.heic$/i, '.jpg');
        contentType = 'image/jpeg';
      }

      const key = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${filename}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, buffer, { contentType, cacheControl: '3600', upsert: false });

      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));