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
  credentials: {
    accessKeyId:   R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

exports.handler = async function(event) {
  const { url } = event.queryStringParameters || {};
  if (!url) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  // bontsuk ki a kulcsot a pathből:
  const u = new URL(url);
  let key = decodeURIComponent(u.pathname);
  // ha "/fotok/xxx.jpg", vágjuk le a "/fotok/"-t
  const prefix = `/${R2_BUCKET}/`;
  if (key.startsWith(prefix)) {
    key = key.slice(prefix.length);
  }
  // ha csak "/xxx.jpg", vágjuk le a kezdő "/"-t
  if (key.startsWith('/')) {
    key = key.slice(1);
  }

  try {
    const resp = await s3.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key
    }));
    const chunks = [];
    for await (const chunk of resp.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type':    resp.ContentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'   // vagy csak https://fotofeltolto.netlify.app
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
