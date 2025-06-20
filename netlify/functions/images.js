// netlify/functions/images.js
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const {
  R2_ACCOUNT_ID,    // pl. 76ae3e2722261d3cc9eae901757c9931
  R2_BUCKET,        // pl. fotok
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY
} = process.env;

// Public Dev URL, amit most engedélyeztél
const DEV_BASE = `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.dev`;

const s3 = new S3Client({
  endpoint: `${DEV_BASE}`,  // bár a ListObjectsV2 parancs erre megy
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

    const images = Contents
      .filter(o => !o.Key.startsWith('.'))
      .map(o => ({
        name: o.Key,
        // IDE építjük be a PUBLIC DEV HOST-ot + bucket név nélkül, mert a {bucket}.{account}.r2.dev már tartalmazza a bucketet
        url: `${DEV_BASE}/${encodeURIComponent(o.Key)}`
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
