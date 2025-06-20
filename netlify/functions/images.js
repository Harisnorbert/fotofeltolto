const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY
} = process.env;

// API endpoint: cloudflarestorage.com domain!
const apiEndpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  endpoint: apiEndpoint,
  region: 'auto',
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

exports.handler = async () => {
  try {
    const { Contents = [] } = await s3.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 1000
    }));

    // Build public URLs via the r2.dev domain
    const pubBase = `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.dev`;

    const images = Contents
      .filter(o => !o.Key.startsWith('.'))
      .map(o => ({
        name: o.Key,
        url: `${pubBase}/${encodeURIComponent(o.Key)}`
      }));

    return {
      statusCode: 200,
      body: JSON.stringify({ images })
    };
  } catch (err) {
    console.error('R2 list error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
