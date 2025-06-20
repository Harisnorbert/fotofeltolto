const multipart = require('parse-multipart');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY
} = process.env;

if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 env vars');
}

const s3 = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // parse multipart/form-data body
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const bodyBuffer  = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    const boundary    = multipart.getBoundary(contentType);
    const parts       = multipart.Parse(bodyBuffer, boundary);

    const uploaded = [];

    for (const part of parts) {
      // sanitize filename
      const base = part.filename
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g,'');
      const safe = base
        .toLowerCase()
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

      uploaded.push({ key, name: part.filename });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, uploaded })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
