/**
 * Legal documents via App Files.
 *
 * Bytes go browser → object storage. SQLite keeps a file id, never the blob.
 * That is what used to blow up sync: every upload was base64 in `file_data`,
 * then copied into the app directory, then read into the writer outbox.
 */
function _paprFiles() {
  if (window.__paprFiles) return Promise.resolve(window.__paprFiles);
  return import("/__papr__/papr-files.js").then(function (mod) {
    var files = (mod.papr || mod.default).files;
    window.__paprFiles = files;
    return files;
  });
}

function _lglUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function _lglB64ToBlob(b64, mime) {
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || "application/octet-stream" });
}

async function ensureDocumentsFileIdColumn() {
  if (window.__drFileIdReady) return;
  try {
    await dbWrite("ALTER TABLE documents ADD COLUMN file_id TEXT");
  } catch (e) {
    /* already exists */
  }
  window.__drFileIdReady = true;
}

async function _lglUpload(subId, file) {
  await ensureDocumentsFileIdColumn();
  var files = await _paprFiles();
  var uploaded = await files.upload(file, {
    name: file.name,
    mime: file.type || "application/octet-stream",
    scope: "app",
  });
  await dbWrite(
    "INSERT INTO documents (id,section_id,name,description,file_type,file_id,file_size,mime_type,uploaded_at,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      _lglUuid(),
      subId,
      file.name,
      "",
      "file",
      uploaded.id,
      file.size,
      file.type || "application/octet-stream",
      new Date().toISOString(),
      Date.now(),
    ],
  );
}

async function _lglOpenUrl(url, name) {
  var a = document.createElement("a");
  a.href = url;
  a.download = name || "file";
  a.target = "_blank";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    a.remove();
  }, 2000);
}

async function _lglDownload(docId) {
  try {
    var rows = await dbQuery(
      "SELECT name,file_id,file_url,file_data,mime_type FROM documents WHERE id=?",
      [docId],
    );
    if (!rows || !rows[0]) {
      toast("Document not found");
      return;
    }
    var d = rows[0];
    if (d.file_id) {
      try {
        var files = await _paprFiles();
        var resolved = await files.url(d.file_id);
        if (resolved && resolved.url) {
          toast("Downloading " + d.name);
          await _lglOpenUrl(resolved.url, d.name);
          return;
        }
      } catch (sdkErr) {
        console.warn("[legal] App Files resolve failed, trying fallbacks", sdkErr);
      }
    }
    if (d.file_url && /^https?:\/\//i.test(d.file_url)) {
      toast("Downloading " + d.name);
      await _lglOpenUrl(d.file_url, d.name);
      return;
    }
    if (d.file_data) {
      var dataUri =
        "data:" +
        (d.mime_type || "application/octet-stream") +
        ";base64," +
        d.file_data;
      toast("Downloading " + d.name);
      await _lglOpenUrl(dataUri, d.name);
      return;
    }
    toast("Downloading " + d.name + "…");
    await _lglOpenUrl("/doc/" + docId, d.name);
  } catch (e) {
    toast("Download failed: " + (e.message || e));
  }
}

async function _lglDelete(docId) {
  if (!confirm("Delete this file?")) return false;
  try {
    var rows = await dbQuery("SELECT file_id FROM documents WHERE id=?", [docId]);
    var fileId = rows && rows[0] && rows[0].file_id;
    if (fileId) {
      var files = await _paprFiles();
      await files.remove(fileId);
    }
  } catch (e) {
    console.warn("[legal] App Files remove failed; deleting the row anyway", e);
  }
  await dbWrite("DELETE FROM documents WHERE id=?", [docId]);
  return true;
}

/**
 * Move leftover `file_data` blobs into App Files once, then null the column.
 * Safe to call on every founder load — no-ops when nothing remains.
 */
async function migrateLegalBlobsToAppFiles() {
  await ensureDocumentsFileIdColumn();
  var rows;
  try {
    rows = await dbQuery(
      "SELECT id,name,mime_type,file_data FROM documents WHERE file_data IS NOT NULL AND length(file_data) > 0 AND (file_id IS NULL OR file_id='')",
    );
  } catch (e) {
    return 0;
  }
  if (!rows || !rows.length) return 0;
  var files = await _paprFiles();
  var moved = 0;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    try {
      var blob = _lglB64ToBlob(row.file_data, row.mime_type);
      var uploaded = await files.upload(blob, {
        name: row.name || "document",
        mime: row.mime_type || "application/octet-stream",
        scope: "app",
      });
      await dbWrite("UPDATE documents SET file_id=?, file_data=NULL WHERE id=?", [
        uploaded.id,
        row.id,
      ]);
      moved += 1;
    } catch (err) {
      console.warn("[legal] migrate failed for", row.name, err);
    }
  }
  if (moved) toast("Moved " + moved + " document(s) to App Files");
  return moved;
}

window._lglUuid = _lglUuid;
window._lglUpload = _lglUpload;
window._lglDownload = _lglDownload;
window._lglDelete = _lglDelete;
window.migrateLegalBlobsToAppFiles = migrateLegalBlobsToAppFiles;
window.ensureDocumentsFileIdColumn = ensureDocumentsFileIdColumn;
