require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.json());
app.use(express.static('public'));

// Configuration Multer (mémoire)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Base de données simplifiée
const fileDatabase = {};

// Route d'upload avec Axios
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier téléchargé' });
    }

    const fileId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(req.file.originalname);
    const filename = fileId + ext;

    // Préparation du FormData
    const form = new FormData();
    form.append('fileId', fileId);
    form.append('file', req.file.buffer, {
      filename: filename,
      contentType: req.file.mimetype
    });

    // Envoi à Appwrite via Axios
    const response = await axios.post(
      `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': process.env.APPWRITE_API_KEY
        }
      }
    );

    // Stockage des métadonnées
    fileDatabase[fileId] = {
      id: fileId,
      originalName: req.file.originalname,
      appwriteFileId: response.data.$id,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date().toISOString()
    };

    res.json({
      success: true,
      fileId: fileId,
      shareLink: `${req.protocol}://${req.get('host')}/share/${fileId}`
    });

  } catch (error) {
    console.error('Erreur Axios:', {
      message: error.message,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: 'Échec de l\'upload',
      details: error.response?.data || error.message 
    });
  }
});

// Route pour récupérer les infos du fichier
app.get('/api/file/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileInfo = fileDatabase[fileId];

  if (!fileInfo) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }

  res.json({
    originalName: fileInfo.originalName,
    mimetype: fileInfo.mimetype,
    size: fileInfo.size,
    uploadDate: fileInfo.uploadDate
  });
});

// Route de téléchargement
app.get('/download/:fileId', async (req, res) => {
  const fileId = req.params.fileId;
  const fileInfo = fileDatabase[fileId];

  if (!fileInfo) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }

  try {
    const response = await axios.get(
      `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileInfo.appwriteFileId}/download`,
      {
        headers: {
          'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': process.env.APPWRITE_API_KEY
        },
        responseType: 'stream'
      }
    );

    // Définir les en-têtes du fichier
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
    res.setHeader('Content-Type', fileInfo.mimetype);

    // Streamer le fichier
    response.data.pipe(res);

  } catch (error) {
    console.error('Erreur de téléchargement:', error.message);
    res.status(500).json({ error: 'Échec du téléchargement' });
  }
});

// Cleanup (optionnel)
app.delete('/api/cleanup', async (req, res) => {
  try {
    const filesToDelete = Object.values(fileDatabase)
      .filter(file => (new Date() - new Date(file.uploadDate)) > 24 * 60 * 60 * 1000);

    for (const file of filesToDelete) {
      await axios.delete(
        `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${file.appwriteFileId}`,
        {
          headers: {
            'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY
          }
        }
      );
      delete fileDatabase[file.id];
    }

    res.json({ deleted: filesToDelete.length });
  } catch (error) {
    console.error('Erreur cleanup:', error);
    res.status(500).json({ error: 'Échec du nettoyage' });
  }
});

// Routes statiques
app.get('/share/:fileId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
  console.log('Configuration Appwrite:');
  console.log('- Endpoint:', process.env.APPWRITE_ENDPOINT);
  console.log('- Bucket ID:', process.env.APPWRITE_BUCKET_ID);
});