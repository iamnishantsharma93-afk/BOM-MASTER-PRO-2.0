const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
} = require("electron");

const path = require("path");
const fs = require("fs");
const os = require("os");

let win;
let backendProcess;

// =====================================================
// MASTER BOM LIBRARY — configurable storage folder
// =====================================================

const masterBomConfigPath = () =>
  path.join(app.getPath("userData"), "master-bom-config.json");

function getMasterBomLibraryDir() {
  try {
    const p = masterBomConfigPath();

    if (fs.existsSync(p)) {
      const config = JSON.parse(fs.readFileSync(p, "utf-8"));

      if (
        config.libraryDir &&
        fs.existsSync(config.libraryDir)
      ) {
        return config.libraryDir;
      }
    }
  } catch (error) {
    console.error("Failed to read Master BOM config:", error);
  }

  return app.getPath("userData");
}

function setMasterBomLibraryDir(newDir) {
  fs.writeFileSync(
    masterBomConfigPath(),
    JSON.stringify({ libraryDir: newDir })
  );
}

// =====================================================
// ADMIN MODE — password gates Delete + folder-change
// =====================================================

const adminConfigPath = () =>
  path.join(app.getPath("userData"), "admin-config.json");

function getAdminPasswordHash() {
  try {
    const p = adminConfigPath();

    if (fs.existsSync(p)) {
      const config = JSON.parse(fs.readFileSync(p, "utf-8"));
      return config.passwordHash || null;
    }
  } catch (error) {
    console.error("Failed to read admin config:", error);
  }

  return null;
}
const MASTER_PASSWORD = "BMP-2026-Nishant";

function setAdminPassword(password) {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(password).digest("hex");

  fs.writeFileSync(
    adminConfigPath(),
    JSON.stringify({ passwordHash: hash })
  );
}

function verifyAdminPassword(password) {
  if (password === MASTER_PASSWORD) {
    return true;
  }

  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const stored = getAdminPasswordHash();

  return stored === hash;
}

ipcMain.handle("admin-has-password", async () => {
  return !!getAdminPasswordHash();
});

ipcMain.handle("admin-set-password", async (event, password) => {
  setAdminPassword(password);
  return { ok: true };
});

ipcMain.handle("admin-verify-password", async (event, password) => {
  return { ok: verifyAdminPassword(password) };
});

function getServerDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "server")
    : path.join(__dirname, "..", "server");
}

function startBackend() {
  const { spawn } = require("child_process");
  const serverDir = getServerDir();
  const serverEntry = path.join(serverDir, "src", "server.js");

  backendProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "ignore",
  });

  backendProcess.on("error", (error) => {
    console.error("Failed to start AI backend:", error);
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,

    // IMPORTANT:
    // Window starts hidden so white blank screen is not visible.
    show: false,

    title: "BOM MASTER PRO V2.0",

    icon: path.join(__dirname, "..", "build", "icon.ico"),

    // This color is only used during rendering.
    backgroundColor: "#f5f7fa",

    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.cjs"
      ),

      contextIsolation: true,
      nodeIntegration: false,

      // Keep this as it is because
      // your current app is working with it.
      sandbox: false,
    },

    autoHideMenuBar: true,
  });

  // Show window only after renderer has
  // completed loading the HTML/React application.
  win.webContents.once(
    "did-finish-load",
    () => {
      if (win && !win.isDestroyed()) {
        win.show();
      }
    }
  );

  // If renderer fails to load,
  // show the window anyway so the error is visible.
  win.webContents.once(
    "did-fail-load",
    (
      event,
      errorCode,
      errorDescription
    ) => {
      console.error(
        "BOM MASTER PRO load failed:",
        errorCode,
        errorDescription
      );

      if (win && !win.isDestroyed()) {
        win.show();
      }
    }
  );

  // In development (npm run electron:dev), always load
  // the LIVE Vite dev server so code changes show up
  // immediately without a manual build. In a packaged
  // production build, load the static dist/index.html.
  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:5173").catch(
      (error) => {
        console.error(
          "Failed to load dev server:",
          error
        );

        if (
          win &&
          !win.isDestroyed()
        ) {
          win.show();
        }
      }
    );
  } else {
    const indexPath = path.join(
      __dirname,
      "../dist/index.html"
    );

    win.loadFile(indexPath).catch(
      (error) => {
        console.error(
          "Failed to load application:",
          error
        );

        if (
          win &&
          !win.isDestroyed()
        ) {
          win.show();
        }
      }
    );
  }

  win.on("closed", () => {
    win = null;
  });
}


// =====================================================
// NATIVE EXCEL FILE PICKER
// Remembers the last folder used for BOM uploads.
// =====================================================

const lastFolderPath = () =>
  path.join(
    app.getPath("userData"),
    "bom-last-folder.json"
  );

function readLastFolder() {
  try {
    const file = lastFolderPath();

    if (!fs.existsSync(file)) {
      return null;
    }

    const data = JSON.parse(
      fs.readFileSync(file, "utf-8")
    );

    if (
      data &&
      typeof data.folder === "string" &&
      fs.existsSync(data.folder)
    ) {
      return data.folder;
    }
  } catch (error) {
    console.error(
      "Failed to read last BOM folder:",
      error
    );
  }

  return null;
}

function saveLastFolder(folder) {
  try {
    fs.writeFileSync(
      lastFolderPath(),
      JSON.stringify({ folder })
    );
  } catch (error) {
    console.error(
      "Failed to save last BOM folder:",
      error
    );
  }
}

ipcMain.handle(
  "select-excel-files",
  async (event, multi) => {
    if (
      !win ||
      win.isDestroyed()
    ) {
      return [];
    }

    const lastFolder = readLastFolder();

    const dialogOptions = {
      title:
        "Select BOM Excel File" +
        (multi ? "(s)" : ""),

      properties: multi
        ? [
            "openFile",
            "multiSelections",
          ]
        : ["openFile"],

      filters: [
        {
          name:
            "Excel Files",

          extensions: [
            "xlsx",
            "xls",
          ],
        },
      ],
    };

    // Open the picker in the last folder used.
    if (lastFolder) {
      dialogOptions.defaultPath = lastFolder;
    }

    const result =
      await dialog.showOpenDialog(
        win,
        dialogOptions
      );

    if (
      result.canceled ||
      !result.filePaths.length
    ) {
      return [];
    }

    // Remember the folder for the next upload.
    saveLastFolder(
      path.dirname(result.filePaths[0])
    );

    return result.filePaths.map(
      (p) => ({
        name: path.basename(p),
        base64: fs
          .readFileSync(p)
          .toString("base64"),
      })
    );
  }
);

// =====================================================
// AI DATABASE FOLDER PICKER (for MY-PERSONAL-AI backend)
// =====================================================

ipcMain.handle(
  "select-ai-database-folder",
  async () => {
    if (!win || win.isDestroyed()) {
      return null;
    }

    const result = await dialog.showOpenDialog(win, {
      title: "Select AI Database Folder",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths.length) {
      return null;
    }

    return result.filePaths[0];
  }
);

// =====================================================
// MASTER BOM FOLDER PICKER
// =====================================================

ipcMain.handle(
  "select-master-bom-folder",
  async () => {
    if (!win || win.isDestroyed()) {
      return null;
    }

    const result = await dialog.showOpenDialog(win, {
      title: "Select Master BOM Database Folder",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths.length) {
      return null;
    }

    const oldLibraryFile = libraryPath();
    const newDir = result.filePaths[0];
    const newLibraryFile = path.join(newDir, "bom-library.json");

    // If the new folder doesn't already have a library file,
    // carry over the existing data automatically.
    if (
      !fs.existsSync(newLibraryFile) &&
      fs.existsSync(oldLibraryFile)
    ) {
      fs.copyFileSync(oldLibraryFile, newLibraryFile);
    }

    setMasterBomLibraryDir(newDir);

    return newDir;
  }
);

ipcMain.handle(
  "get-master-bom-folder",
  async () => {
    return getMasterBomLibraryDir();
  }
);
ipcMain.handle("get-username", async () => {
  return os.userInfo().username;
});
// =====================================================
// MASTER BOM LIBRARY — folder-based (files live
// directly in the configured library folder)
// =====================================================

function listMasterBomFiles() {
  const dir = getMasterBomLibraryDir();

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls"));
}

ipcMain.handle("master-bom-list-files", async () => {
  return listMasterBomFiles();
});

ipcMain.handle("master-bom-add-files", async () => {
  if (!win || win.isDestroyed()) {
    return { ok: false, count: 0 };
  }

  const result = await dialog.showOpenDialog(win, {
    title: "Select BOM Excel File(s)",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
  });

  if (result.canceled || !result.filePaths.length) {
    return { ok: true, count: 0 };
  }

  const dir = getMasterBomLibraryDir();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  result.filePaths.forEach((srcPath) => {
    const destPath = path.join(dir, path.basename(srcPath));
    fs.copyFileSync(srcPath, destPath);
  });

  return { ok: true, count: result.filePaths.length };
});

ipcMain.handle("master-bom-read-file", async (event, fileName) => {
  const filePath = path.join(getMasterBomLibraryDir(), fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath).toString("base64");
});

ipcMain.handle("master-bom-delete-file", async (event, fileName) => {
  try {
    const filePath = path.join(getMasterBomLibraryDir(), fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("master-bom-clear-files", async () => {
  try {
    listMasterBomFiles().forEach((fileName) => {
      fs.unlinkSync(path.join(getMasterBomLibraryDir(), fileName));
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
// =====================================================
// BOM LIBRARY — a permanent local database of every
// BOM ever uploaded. Files are never wiped just
// because a Master BOM was built; they stay in the
// library until the user explicitly deletes them.
// =====================================================

const libraryPath = () =>
  path.join(
    getMasterBomLibraryDir(),
    "bom-library.json"
  );

function readLibrary() {
  const p = libraryPath();

  if (!fs.existsSync(p)) {
    return [];
  }

  try {
    return JSON.parse(
      fs.readFileSync(p, "utf-8")
    );
  } catch (error) {
    console.error(
      "Failed to read BOM library:",
      error
    );

    return [];
  }
}

function writeLibrary(list) {
  fs.writeFileSync(
    libraryPath(),
    JSON.stringify(list)
  );
}

// Returns the full library (all BOMs ever added).
ipcMain.handle(
  "library-load",
  async () => {
    return readLibrary();
  }
);

// Adds one or more new BOM entries to the
// library (does NOT remove existing ones) and
// returns the updated full library.
ipcMain.handle(
  "library-add",
  async (event, newEntries) => {
    try {
      const list = readLibrary();

      // Same Model overwrites the old entry
      // instead of creating a duplicate.
      const incomingModels = newEntries.map(
        (e) => e.model
      );

      const kept = list.filter(
        (item) =>
          !incomingModels.includes(
            item.model
          )
      );

      const updated = [
        ...kept,
        ...newEntries,
      ];

      writeLibrary(updated);

      return { ok: true, list: updated };
    } catch (error) {
      console.error(
        "Failed to add to BOM library:",
        error
      );

      return {
        ok: false,
        error: error.message,
        list: readLibrary(),
      };
    }
  }
);

// Removes one BOM (by id) from the library
// permanently and returns the updated list.
ipcMain.handle(
  "library-remove",
  async (event, id) => {
    try {
      const list = readLibrary().filter(
        (item) => item.id !== id
      );

      writeLibrary(list);

      return { ok: true, list };
    } catch (error) {
      console.error(
        "Failed to remove from BOM library:",
        error
      );

      return {
        ok: false,
        error: error.message,
        list: readLibrary(),
      };
    }
  }
);

// Wipes the ENTIRE library permanently.
ipcMain.handle(
  "library-clear",
  async () => {
    try {
      if (fs.existsSync(libraryPath())) {
        fs.unlinkSync(libraryPath());
      }

      return { ok: true };
    } catch (error) {
      console.error(
        "Failed to clear BOM library:",
        error
      );

      return {
        ok: false,
        error: error.message,
      };
    }
  }
);

// =====================================================
// APP START
// =====================================================

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createWindow();
      }
    }
  );
});


// =====================================================
// APP CLOSE
// =====================================================

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});