import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

export const handler = async () => {
  try {
    const resp = await s3.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 1000
    }));
    const images = (resp.Contents || [])
      .filter(o => !o.Key.startsWith('.'))
      .map(o => ({
        name: o.Key,
        url: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${encodeURIComponent(o.Key)}`
      }));
    return { statusCode: 200, body: JSON.stringify({ images }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
