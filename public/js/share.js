document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const fileInfoShare = document.getElementById('fileInfoShare');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');
    const uploadDate = document.getElementById('uploadDate');
    const fileIconImg = document.getElementById('fileIconImg');
    const imagePreview = document.getElementById('imagePreview');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Récupérer l'ID du fichier depuis l'URL
    const pathParts = window.location.pathname.split('/');
    const fileId = pathParts[pathParts.length - 1];
    
    // Charger les informations du fichier
    loadFileInfo(fileId);
    
    // Événements
    downloadBtn.addEventListener('click', function() {
        window.location.href = `/download/${fileId}`;
    });
    
    // Fonctions
    function loadFileInfo(fileId) {
        loading.style.display = 'block';
        errorMessage.style.display = 'none';
        fileInfoShare.style.display = 'none';
        
        fetch(`/api/file/${fileId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Fichier non trouvé');
                }
                return response.json();
            })
            .then(fileInfo => {
                // Afficher les informations du fichier
                fileName.textContent = fileInfo.originalName;
                fileSize.textContent = formatFileSize(fileInfo.size);
                fileType.textContent = fileInfo.mimetype;
                uploadDate.textContent = `Uploadé le: ${new Date(fileInfo.uploadDate).toLocaleString()}`;
                
                // Définir l'icône du fichier
                setFileIcon(fileInfo.mimetype);
                
                // Afficher l'aperçu si c'est une image
                if (fileInfo.mimetype.startsWith('image/')) {
                    imagePreview.src = `/download/${fileId}`;
                    imagePreview.style.display = 'block';
                } else {
                    imagePreview.style.display = 'none';
                }
                
                loading.style.display = 'none';
                fileInfoShare.style.display = 'block';
            })
            .catch(error => {
                loading.style.display = 'none';
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            });
    }
    
    function setFileIcon(mimeType) {
        const iconPath = getFileIconPath(mimeType);
        fileIconImg.src = iconPath;
    }
    
    function getFileIconPath(mimeType) {
        if (mimeType.startsWith('image/')) {
            return '/icons/image-icon.png';
        } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
            return '/icons/text-icon.png';
        } else if (mimeType === 'application/pdf') {
            return '/icons/pdf-icon.png';
        } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
            return '/icons/excel-icon.png';
        } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
            return '/icons/powerpoint-icon.png';
        } else if (mimeType.includes('word')) {
            return '/icons/word-icon.png';
        } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
            return '/icons/zip-icon.png';
        } else {
            return '/icons/generic-icon.png';
        }
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});