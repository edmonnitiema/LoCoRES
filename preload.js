const { contextBridge, ipcRenderer } = require('electron');

// Pont d'enregistrement : même nom que dans l'APK (window.Pont)
contextBridge.exposeInMainWorld('Pont', {
  enregistrer: (name, type, b64, dossier, titre) =>
    ipcRenderer.invoke('pont:enregistrer', name, type, b64, dossier, titre)
});
