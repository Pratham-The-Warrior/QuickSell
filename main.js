const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

process.on('uncaughtException', err => {
  const p = app ? app.getPath('userData') : __dirname;
  fs.writeFileSync(path.join(p, 'crash.log'), err.stack);
});
process.on('unhandledRejection', err => {
  const p = app ? app.getPath('userData') : __dirname;
  fs.writeFileSync(path.join(p, 'crash.log'), err.stack);
});

// Keep a global reference of the window object
let mainWindow;

// Function to start the Express server
function startServer() {
  return new Promise((resolve) => {
    process.env.PORT = 0; 
    process.env.DB_PATH = path.join(app.getPath('userData'), 'quicksell.db');
    
    // We load the existing server code
    const server = require('./server/index.js');
    
    // Give the server a moment to start and bind
    setTimeout(() => {
      const address = server.address();
      const port = address ? address.port : 3001; // fallback
      resolve(`http://localhost:${port}`);
    }, 1500);
  });
}

function createWindow(serverUrl) {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'QuickSell POS',
    icon: path.join(__dirname, 'client/public/favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove the default Electron menu for a cleaner POS feel
  Menu.setApplicationMenu(null);

  // Load the Express server URL
  mainWindow.loadURL(serverUrl);

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.on('ready', async () => {
  try {
    const serverUrl = await startServer();
    createWindow(serverUrl);
  } catch (err) {
    console.error('Failed to start server:', err);
    app.quit();
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow('http://localhost:3001');
  }
});
