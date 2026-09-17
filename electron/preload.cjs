const {
  contextBridge,
  ipcRenderer,
} = require("electron");

contextBridge.exposeInMainWorld(
  "electronAPI",
  {
    isElectron: true,

    selectExcelFiles:
      (multi) =>
        ipcRenderer.invoke(
          "select-excel-files",
          multi
        ),

    libraryLoad:
      () =>
        ipcRenderer.invoke(
          "library-load"
        ),

    libraryAdd:
      (newEntries) =>
        ipcRenderer.invoke(
          "library-add",
          newEntries
        ),

    libraryRemove:
      (id) =>
        ipcRenderer.invoke(
          "library-remove",
          id
        ),

    libraryClear:
      () =>
        ipcRenderer.invoke(
          "library-clear"
        ),

    selectAiDatabaseFolder:
      () =>
        ipcRenderer.invoke(
          "select-ai-database-folder"
        ),

    selectMasterBomFolder:
      () =>
        ipcRenderer.invoke(
          "select-master-bom-folder"
        ),

    getMasterBomFolder:
      () =>
        ipcRenderer.invoke(
          "get-master-bom-folder"
        ),

    getUsername:
      () =>
        ipcRenderer.invoke(
          "get-username"
        ),
            adminHasPassword:
      () =>
        ipcRenderer.invoke(
          "admin-has-password"
        ),

    adminSetPassword:
      (password) =>
        ipcRenderer.invoke(
          "admin-set-password",
          password
        ),

    adminVerifyPassword:
      (password) =>
        ipcRenderer.invoke(
          "admin-verify-password",
          password
        ),
    masterBomListFiles:
      () =>
        ipcRenderer.invoke(
          "master-bom-list-files"
        ),

    masterBomAddFiles:
      () =>
        ipcRenderer.invoke(
          "master-bom-add-files"
        ),

    masterBomReadFile:
      (fileName) =>
        ipcRenderer.invoke(
          "master-bom-read-file",
          fileName
        ),

    masterBomDeleteFile:
      (fileName) =>
        ipcRenderer.invoke(
          "master-bom-delete-file",
          fileName
        ),

    masterBomClearFiles:
      () =>
        ipcRenderer.invoke(
          "master-bom-clear-files"
        ),
  }
);