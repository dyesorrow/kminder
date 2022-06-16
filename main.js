// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require("fs");

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    minWidth: 1000,
    minHeight: 700,
    show: false, // 先隐藏
    // frame: false,
    // transparent: true,
    // resizable: true,
    webPreferences: {
      nodeIntegration: true,
      // contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, "./preload.js")
    }
  });
  mainWindow.on('ready-to-show', function () {
    mainWindow.show(); // 初始化后再显示
  });
  mainWindow.loadFile(path.join(__dirname, "./src/index.html"));
  globalShortcut.register('Alt+I', () => {
    mainWindow.webContents.openDevTools();
  });

  let IPC = function () {
    let listen = {};
    ipcMain.on("toMain", (event, data) => {
      if (listen[data.func]) {
        listen[data.func](...data.params);
      }
    });
    return {
      send(func, ...params) {
        mainWindow.webContents.send("fromMain", {
          func: func,
          params: params
        });
      },
      on(func, callback) {
        listen[func] = callback;
      }
    };
  }();

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  Menu.setApplicationMenu(null);




  IPC.on("load-file", (filepath) => {
    filepath = filepath || (process.argv.length >= 2 && process.argv[1] !== "." ? process.argv[1] : null);

    if (filepath) {
      if (fs.existsSync(filepath) && !fs.statSync(filepath).isDirectory()) {
        let content = fs.readFileSync(filepath).toString();
        IPC.send("load-file-success", {
          filepath,
          content,
        });
        return;
      }
    }

    IPC.send("load-file-success", null);
  });

  IPC.on("save-file", async (filepath, text) => {
    if (filepath) {
      fs.writeFileSync(filepath, text);
    } else {
      let result = await dialog.showOpenDialog({
        properties: ['openFile']
      });
      if (!result.canceled) {
        filepath = result.filePaths[0];
        IPC.send("save-file-success", result.filePaths[0]);
        fs.writeFileSync(result.filePaths[0], text);
      }
    }
  });
});



