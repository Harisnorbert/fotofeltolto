require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const { Storage, File } = require('megajs');

const app = express();
const upload = multer({ dest: 'tmp/' });

// -- MEGA Setup (logged-in Storage)
const storage = new Storage({
  email: process.env.MEGA_EMAIL,
  password: process.env.MEGA_PASSWORD
});

let megaFolder;  
storage.on('ready', () => {
  // grab the target folder by its ID
  megaFolder = storage.root.children[process.env.MEGA_FOLDER_ID];
});

// -- Serve static front-end
app.use(express.static(path.join(__dirname, 'public')));

// -- Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!megaFolder) throw new Error('MEGA not ready');
    // upload the temp file to MEGA
    await new Promise((resolve, reject) => {
      megaFolder.upload(
        fs.createReadStream(req.file.path),
        { name: req.file.originalname },
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    fs.unlinkSync(req.file.path);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -- List files endpoint
app.get('/api/files', async (_req, res) => {
  try {
    if (!megaFolder) throw new Error('MEGA not ready');
    // refresh children (in case new uploads)
    const children = await megaFolder.refresh().then(() => megaFolder.children);
    const files = children
      .filter(c => c instanceof File)
      .map(f => ({
        id: f.nodeId,
        name: f.name,
        // public link for viewing/downloading
        link: f.link()
      }));
    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -- Download All endpoint (zips everything)
app.get('/api/download-all', async (_req, res) => {
  try {
    if (!megaFolder) throw new Error('MEGA not ready');
    const children = await megaFolder.refresh().then(() => megaFolder.children);
    const files = children.filter(c => c instanceof File);

    res.setHeader('Content-Disposition', 'attachment; filename="all_photos.zip"');
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip');
    archive.pipe(res);

    // stream each MEGA file into the zip
    for (let f of files) {
      const stream = await f.download(); // returns a ReadableStream
      archive.append(stream, { name: f.name });
    }

    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
