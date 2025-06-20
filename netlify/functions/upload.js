import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multipart from 'parse-multipart';
import dotenv from 'dotenv';
dotenv.config();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY
} = process.env;

const s3 = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    // parseFormData
    const boundary = multipart.getBoundary(event.headers['content-type']);
    const parts = multipart.Parse(Buffer.from(event.body, 'base64'), boundary);

    for (const part of parts) {
      const filename = part.filename;
      // sanitize filename
      const base = filename.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
      const safe = base.toLowerCase()
                       .replace(/[^a-z0-9._-]/g,'_')
                       .replace(/_+/g,'_')
                       .replace(/^[_-]+|[_-]+$/g,'');
      const key = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safe}`;

      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: part.data,
        ContentType: part.type
      }));
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
