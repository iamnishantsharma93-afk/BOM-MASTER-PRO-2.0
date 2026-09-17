require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { authorize } = require("./driveAuth");

const { getDataDir } = require("./config");

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
function getLocalDocsDir() {
  return path.join(getDataDir(), "documents");
}
function getLocalBomDir() {
  return path.join(getDataDir(), "documents", "bom");
}

async function downloadFile(drive, fileId, destPath) {
  const dest = fs.createWriteStream(destPath);
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    res.data.on("end", resolve).on("error", reject).pipe(dest);
  });
}

async function syncFolder(drive, folderId, localPath) {
  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(localPath, { recursive: true });
  }

  const list = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
  });

  for (const file of list.data.files) {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      if (file.name.toLowerCase() === "bom") {
        await syncFolder(drive, file.id, getLocalBomDir());
      }
      continue;
    }

    console.log(`Downloading: ${file.name}`);
    await downloadFile(drive, file.id, path.join(localPath, file.name));
  }
}

async function runSync() {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });

  await syncFolder(drive, FOLDER_ID, getLocalDocsDir());

  console.log("Drive sync complete.");
}

module.exports = { runSync };