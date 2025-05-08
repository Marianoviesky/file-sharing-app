document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');
    const fileIcon = document.getElementById('fileIcon');
    const fileIconContainer = document.getElementById('fileIconContainer');
    const imagePreview = document.getElementById('imagePreview');
    const cancelBtn = document.getElementById('cancelBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const loading = document.getElementById('loading');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const errorMessage = document.getElementById('errorMessage');
    const shareResult = document.getElementById('shareResult');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyBtn = document.getElementById('copyBtn');
    const newUploadBtn = document.getElementById('newUploadBtn');
    
    // Variables
    let selectedFile = null;
    
    // Événements
    browseBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect({ target: fileInput });
        }
    });
    
    cancelBtn.addEventListener('click', resetUploadForm);
    uploadBtn.addEventListener('click', uploadFile);
    copyBtn.addEventListener('click', copyShareLink);
    newUploadBtn.addEventListener('click', resetUploadForm);
    
    // Fonctions
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        selectedFile = file;
        
        // Afficher les informations du fichier
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileType.textContent = file.type || 'Type inconnu';
        
        // Définir l'icône du fichier
        setFileIcon(file);
        
        // Afficher l'aperçu si c'est une image
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
        }
        
        // Afficher la section d'information du fichier
        fileInfo.style.display = 'block';
        uploadArea.style.display = 'none';
    }
    
    function setFileIcon(file) {
        const iconPath = getFileIconPath(file);
        fileIcon.src = iconPath;
        fileIconContainer.style.display = 'flex';
    }
    
    function getFileIconPath(file) {
        if (file.type.startsWith('image/')) {
            return '/icons/image-icon.png';
        } else if (file.type.startsWith('text/') || file.type === 'application/json') {
            return '/icons/text-icon.png';
        } else if (file.type === 'application/pdf') {
            return '/icons/pdf-icon.png';
        } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
            return '/icons/excel-icon.png';
        } else if (file.type.includes('presentation') || file.type.includes('powerpoint')) {
            return '/icons/powerpoint-icon.png';
        } else if (file.type.includes('word')) {
            return '/icons/word-icon.png';
        } else if (file.type.includes('zip') || file.type.includes('compressed')) {
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
    
    function uploadFile() {
      if (!selectedFile) {
        showError('Veuillez sélectionner un fichier');
        return;
      }
    
      fileInfo.style.display = 'none';
      loading.style.display = 'block';
      errorMessage.style.display = 'none';
    
      const formData = new FormData();
      formData.append('file', selectedFile);
    
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = percentComplete + '%';
          progressText.textContent = percentComplete + '%';
        }
      });
    
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                showShareResult(response.shareLink);
              } else {
                showError(response.error || 'Erreur inconnue');
              }
            } catch (e) {
              showError('Réponse invalide du serveur');
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              showError(errorResponse.error || errorResponse.details || 'Erreur de téléchargement');
            } catch (e) {
              showError('Erreur de connexion au serveur');
            }
          }
          loading.style.display = 'none';
        }
      };
    
      xhr.open('POST', '/upload', true);
      xhr.send(formData);
    }
    
    function showShareResult(shareLink) {
        loading.style.display = 'none';
        shareResult.style.display = 'block';
        shareLinkInput.value = shareLink;
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        loading.style.display = 'none';
    }
    
    function copyShareLink() {
        shareLinkInput.select();
        document.execCommand('copy');
        
        // Afficher un feedback
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        
        setTimeout(function() {
            copyBtn.innerHTML = originalText;
        }, 2000);
    }
    
    function resetUploadForm() {
        fileInput.value = '';
        selectedFile = null;
        
        // Réinitialiser l'interface
        fileInfo.style.display = 'none';
        loading.style.display = 'none';
        shareResult.style.display = 'none';
        errorMessage.style.display = 'none';
        uploadArea.style.display = 'block';
        
        // Réinitialiser la barre de progression
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
    }
})