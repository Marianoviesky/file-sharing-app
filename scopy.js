const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

// Configuration pour les fichiers statiques
app.use(express.static('public'));

// Assurer que le dossier uploads existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de Multer pour le stockage des fichiers
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     // Générer un ID unique pour le fichier
//     const uniqueId = crypto.randomBytes(16).toString('hex');
//     // Garder l'extension originale du fichier
//     const ext = path.extname(file.originalname);
//     cb(null, uniqueId + ext);
//   }
// });


// const upload = multer({ 
//   storage: storage,
//   limits: {
//     fileSize: 50 * 1024 * 1024, // Limite à 50MB
//   }
// });
const upload = multer({
    storage: multer.memoryStorage(), // Utilise la mémoire au lieu du disque
    limits: {
      fileSize: 50 * 1024 * 1024 // Limite à 50MB
    }
  });

// Base de données en mémoire pour stocker les détails des fichiers
// Dans une application réelle, utilisez une vraie base de données
const fileDatabase = {};

// Route pour télécharger un fichier
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier téléchargé' });
    }

    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
    
    // Stocker les informations du fichier
    fileDatabase[fileId] = {
      id: fileId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date(),
      path: req.file.path
    };

    // Renvoyer l'ID du fichier au client
    res.json({
      success: true,
      fileId: fileId,
      shareLink: `${req.protocol}://${req.get('host')}/share/${fileId}`
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du fichier' });
  }
});

// Route pour afficher la page de partage
app.get('/share/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileInfo = fileDatabase[fileId];

  if (!fileInfo) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

// Route pour obtenir les informations du fichier
app.get('/api/file/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileInfo = fileDatabase[fileId];

  if (!fileInfo) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }

  // Ne pas envoyer le chemin complet pour des raisons de sécurité
  const safeFileInfo = {
    originalName: fileInfo.originalName,
    mimetype: fileInfo.mimetype,
    size: fileInfo.size,
    uploadDate: fileInfo.uploadDate
  };

  res.json(safeFileInfo);
});

// Route pour télécharger le fichier
app.get('/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileInfo = fileDatabase[fileId];

  if (!fileInfo) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }

  const filePath = path.join(__dirname, fileInfo.path);
  
  // Vérifier si le fichier existe toujours
  if (!fs.existsSync(filePath)) {
    delete fileDatabase[fileId]; // Supprimer de la base de données
    return res.status(404).json({ error: 'Fichier non trouvé sur le serveur' });
  }

  // Configurer les en-têtes pour le téléchargement
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.originalName)}"`);
  res.setHeader('Content-Type', fileInfo.mimetype);
  
  // Envoyer le fichier
  res.sendFile(filePath);
});

// Route pour gérer les demandes de nettoyage (pourrait être programmée avec un cron job)
app.delete('/api/cleanup', (req, res) => {
  const now = new Date();
  let deletedCount = 0;
  
  // Supprimer les fichiers plus vieux que 24 heures
  Object.keys(fileDatabase).forEach(fileId => {
    const fileInfo = fileDatabase[fileId];
    const fileAge = now - new Date(fileInfo.uploadDate);
    
    // 24 heures en millisecondes
    if (fileAge > 24 * 60 * 60 * 1000) {
      const filePath = path.join(__dirname, fileInfo.path);
      
      // Supprimer le fichier s'il existe
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Supprimer de la base de données
      delete fileDatabase[fileId];
      deletedCount++;
    }
  });
  
  res.json({ success: true, deletedFiles: deletedCount });
});

// Gérer toutes les autres routes en servant index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

