// netlify/functions/proxy-image.js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY
} = process.env;

const s3 = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
});

exports.handler = async function(event) {
  const { url } = event.queryStringParameters || {};
  if (!url) {
    return { statusCode:400, body: 'Missing url parameter' };
  }

  // bontsuk ki a kulcsnevet a végpontról
  // url = https://<ACCOUNT>.r2.cloudflarestorage.com/<BUCKET>/<KEY>
  const parts = new URL(url);
  const key = decodeURIComponent(parts.pathname.replace(`/${R2_BUCKET}/`, ''));

  try {
    const resp = await s3.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key
    }));
    // végigolvassuk a Body streamet
    const stream = resp.Body;
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': resp.ContentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'   // vagy csak a Netlify-d
      },
      body: buffer.toString('base64')
    };
  } catch(err) {
    console.error('Proxy-image error:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err.message })
    };
  }
};
