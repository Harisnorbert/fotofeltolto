const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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

exports.handler = async function() {
  try {
    const resp = await s3.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 1000
    }));

    const images = (resp.Contents || [])
      .filter(obj => !obj.Key.startsWith('.'))
      .map(obj => ({
        name: obj.Key,
        url: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(obj.Key)}`
      }));

    return {
      statusCode: 200,
      body: JSON.stringify({ images })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
