import { app, BrowserWindow, ipcMain } from 'electron';
import { PythonShell } from 'python-shell';
import { download } from 'electron-dl';
import fs from 'fs';
import path from 'path';
import { rejects } from 'assert';
import { fileURLToPath } from 'url';

//This module is used to handle specific startup events for applications packaged with Squirrel.Windows.
const module = await import('electron-squirrel-startup');
if (module.default) {
  app.quit();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userDataPath = path.join(app.getPath('userData'));
const imgPath = path.join(userDataPath, 'user_images');
const modelWeightsPath = path.join(userDataPath, 'model_weights');
const pythonPath = getPythonPath();
let win;
let icon;

if (process.platform === 'darwin') {
  icon = path.join(__dirname, 'icons', 'icon.icns');
} else if (process.platform === 'win32') {
  icon = path.join(__dirname, 'icons', 'icon.ico');
} else {
  icon = path.join(__dirname, 'icons', 'icon.png');
}

if (!fs.existsSync(imgPath)) {
  fs.mkdirSync(imgPath, { recursive: true });
  console.log(`Directory created at: ${userDataPath}`);
}
if (!fs.existsSync(modelWeightsPath)) {
  fs.mkdirSync(modelWeightsPath, { recursive: true });
  console.log(`Directory created at: ${modelWeightsPath}`);
}

function createWindow() {
  win = new BrowserWindow({
    // width: 1920,
    // height: 1080,
    // icon: 'src/icon.png',
    icon: icon,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true,
      webgl: true,
    }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  // For macOS, listen for the 'activate' event to open a new window if none are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// For Windows and Linux, quit the app when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function getPythonPath() {
  if (process.platform === 'linux' || process.platform === 'darwin') {
    return path.join(app.getAppPath(), '.venv', 'bin', 'python');
  }
  else if (process.platform === 'win32') {
    return path.join(app.getAppPath(), '.venv', 'Scripts', 'python');
  }
}

function runPythonCode(pythonFilePath, args) {
  return new Promise((resolve, reject) => {
    let options = { mode: 'text', pythonPath: path.resolve(pythonPath), args: args }
    PythonShell.run(pythonFilePath, options).then((results) => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
  });
};

ipcMain.on("download", (event, model) => {
  const absolutePath = path.resolve(modelWeightsPath);
  download(BrowserWindow.getFocusedWindow(), model.modelUrl, { 
    directory: absolutePath,
    showBadge: true,
    showProgressBar: true,
    filename: `${model.modelName}.pt`,
    onProgress: (progress) => {
      win.webContents.send("download-progress", Math.round(progress.percent * 100), (progress.transferredBytes / (1024 * 1024)).toFixed(2));
    }}).then(dl => win.webContents.send("download-completed", dl.getSavePath(), model.modelName));
});

ipcMain.on("process-image", async (event, model) => {
  let isSuccessful = true;
  function base64ToBuffer(base64String) {
    const binaryString = Buffer.from(base64String.split(',')[1], 'base64').toString('binary');
    const buffer = Buffer.from(binaryString, 'binary');
    return buffer;
  }

  function saveImageToFile(buffer, filePath) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          console.log('Error saving image:', err);
          reject();
        } else {
          console.log('Image saved successfully:', filePath);
          resolve();
        }
      });
    });
  }

  const imageBuffer = base64ToBuffer(model.dataUrl);
  try {
    await saveImageToFile(imageBuffer, path.join(imgPath, 'input_image'));
    await runPythonCode(path.join(__dirname, 'maps.py'), [`${model.heightMapMedianFilter}`, imgPath]);
    if (model.selectedModel === 'depth_pro') {
      await runPythonCode(path.join(__dirname, 'models', 'depth_pro', 'run_depth_pro.py'), [`${model.modelInputSize}`, `${model.depthmapGaussianBlur}`, modelWeightsPath, imgPath]);
    }
    else if (model.selectedModel === 'dpt_beit_large_512') {
      await runPythonCode(path.join(__dirname, 'models', 'midas', 'run_dpt_beit_large_512.py'), [`${model.modelInputSize}`, `${model.depthmapGaussianBlur}`, modelWeightsPath, imgPath]);
    }
    else if (model.selectedModel === 'dpt_large_384') {
      await runPythonCode(path.join(__dirname, 'models', 'midas', 'run_dpt_large_384.py'), [`${model.modelInputSize}`, `${model.depthmapGaussianBlur}`, modelWeightsPath, imgPath]);
    }
    else if (model.selectedModel === 'midas_v21_small_256') {
      await runPythonCode(path.join(__dirname, 'models', 'midas', 'run_midas_v21_small_256.py'), [`${model.modelInputSize}`, `${model.depthmapGaussianBlur}`, modelWeightsPath, imgPath]);
    }
  } catch (error) {
    isSuccessful = false;
  } finally {
    win.webContents.send("depth-map-ready", { isSuccessful });
  }
});

ipcMain.on("delete-model", (event, model) => {
  const modelPath = path.join(modelWeightsPath, `${model.modelName}.pt`);
  if (fs.existsSync(modelPath)) {
    fs.unlink(modelPath, (err) => {
      if (err) {
        console.error("An error occurred while deleting the file:", err.message);
        return;
      }
      console.log("File successfully deleted");
    });
} else {
  console.log("This file doesn't exist, cannot delete");
}
});

ipcMain.on('get-weights-path', () => {
  win.webContents.send('weights-path', modelWeightsPath);
});

ipcMain.on('get-user-images-path', () => {
  win.webContents.send('user-images-path', imgPath);
});