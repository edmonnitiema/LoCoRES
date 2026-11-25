const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Évite les fenêtres blanches dues au processeur graphique (fréquent sur les anciens PC)
app.disableHardwareAcceleration();

// Enregistre un fichier dans Documents\<dossier>\ (le dossier est créé s'il n'existe pas)
ipcMain.handle('pont:enregistrer', async (event, name, type, b64, dossier) => {
  try {
    const nettoyer = (t) => String(t || '').replace(/[<>:"\/\\|?*\u0000-\u001f]/g, '_').trim();
    const base = app.getPath('documents');
    const dir = dossier ? path.join(base, nettoyer(dossier)) : base;
    fs.mkdirSync(dir, { recursive: true });
    const fichier = path.join(dir, nettoyer(name) || 'fichier');
    fs.writeFileSync(fichier, Buffer.from(String(b64 || ''), 'base64'));
    return { chemin: fichier, dossier: dossier || '', dossierChemin: dir };
  } catch (err) {
    dialog.showErrorBox('LoCoRES', "Le fichier n'a pas pu être enregistré : " + ((err && err.message) || err));
    return { annule: true };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#f5f6f2',
    title: 'LoCoRES',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  Menu.setApplicationMenu(null);
  win.maximize();

  // F12 ou Ctrl+Maj+I : ouvre la console pour diagnostiquer un problème
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' &&
        (input.key === 'F12' || (input.control && input.shift && input.key.toUpperCase() === 'I'))) {
      win.webContents.toggleDevTools();
    }
  });

  // Affiche la cause exacte au lieu d'une page blanche
  win.webContents.on('did-fail-load', (e, code, desc, url) => {
    dialog.showErrorBox('LoCoRES', 'Échec du chargement de la page.\n\nErreur : ' + code + ' ' + desc + '\n' + url);
  });
  win.webContents.on('render-process-gone', (e, details) => {
    dialog.showErrorBox('LoCoRES', 'Le moteur d\u2019affichage s\u2019est arrêté : ' + details.reason);
  });

  const page = path.join(__dirname, 'LoCoRES.html');
  if (!fs.existsSync(page)) {
    let liste = '';
    try { liste = fs.readdirSync(__dirname).join(', '); } catch (err) {}
    dialog.showErrorBox('LoCoRES',
      'Le fichier LoCoRES.html est absent de l\u2019application.\n\nDossier : ' + __dirname + '\nContenu : ' + liste);
    return;
  }
  win.loadFile(page).catch((err) => {
    dialog.showErrorBox('LoCoRES', 'Impossible d\u2019ouvrir LoCoRES.html : ' + ((err && err.message) || err));
  });

  // Les liens externes (WhatsApp...) s'ouvrent dans le navigateur.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(createWindow);
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.on('window-all-closed', () => app.quit());
}
