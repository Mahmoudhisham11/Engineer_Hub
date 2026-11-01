const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

const isDev = process.env.NODE_ENV !== "production" || !app.isPackaged;
const PORT = process.env.PORT || 3000;
const DEV_URL = `http://127.0.0.1:${PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#090a0f",
    title: "EngineerHub — DME Technical Office Management",
    icon: path.join(__dirname, "icon.png"),
    show: false, // Don't show until ready-to-show to prevent flash of white
    autoHideMenuBar: true, // Clean modern enterprise appearance
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load the application
  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    // In production, load the local server or export
    mainWindow.loadURL(DEV_URL);
  }

  // Smooth window appearance
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external web links in the default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
