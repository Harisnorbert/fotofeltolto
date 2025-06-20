// build-env.js
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const env = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY
}

fs.writeFileSync(
  'public/env.js',
  `window.__ENV__ = ${JSON.stringify(env, null, 2)};`
)