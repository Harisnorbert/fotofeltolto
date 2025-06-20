import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY
} = process.env;

if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 environment variables');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  },
  forcePathStyle: false
});

// 1) Upload endpoint
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const uploaded = [];
    for (const file of req.files) {
      // sanitize filename
      const base = file.originalname
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');
      const safe = base
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^[_-]+|[_-]+$/g, '');

      const key = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}_${safe}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        })
      );
      uploaded.push({ key, name: file.originalname });
    }
    res.json({ success: true, uploaded });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2) List images endpoint
app.get('/images', async (_, res) => {
  try {
    const { Contents } = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        MaxKeys: 1000
      })
    );
    const images = (Contents || [])
      .filter(o => !o.Key.startsWith('.'))
      .map(o => ({
        name: o.Key,
        url: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(
          o.Key
        )}`
      }));
    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Server listening on http://localhost:${port}`)
);
