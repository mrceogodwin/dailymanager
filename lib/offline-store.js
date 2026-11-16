const DB_NAME = "dailymanager-device";
const DB_VERSION = 1;
const SNAPSHOTS = "workspace_snapshots";
const OUTBOX = "mutation_outbox";

function openDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is unavailable."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS, { keyPath: "key" });
      if (!db.objectStoreNames.contains(OUTBOX)) {
        const store = db.createObjectStore(OUTBOX, { keyPath: "id" });
        store.createIndex("created_at", "created_at");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the device database."));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Device database request failed."));
  });
}

export async function saveWorkspaceSnapshot(userId, workspaceId, data) {
  if (!userId || !workspaceId || !data) return false;
  const db = await openDatabase();
  try {
    const tx = db.transaction(SNAPSHOTS, "readwrite");
    tx.objectStore(SNAPSHOTS).put({
      key: String(userId) + ":" + String(workspaceId),
      user_id: String(userId),
      workspace_id: String(workspaceId),
      saved_at: new Date().toISOString(),
      data,
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Could not save workspace data on this device."));
      tx.onabort = () => reject(tx.error || new Error("Device database transaction was cancelled."));
    });
    return true;
  } finally {
    db.close();
  }
}

export async function readWorkspaceSnapshot(userId, workspaceId) {
  if (!userId || !workspaceId) return null;
  const db = await openDatabase();
  try {
    const tx = db.transaction(SNAPSHOTS, "readonly");
    const record = await requestResult(tx.objectStore(SNAPSHOTS).get(String(userId) + ":" + String(workspaceId)));
    return record || null;
  } finally {
    db.close();
  }
}

export async function clearWorkspaceSnapshot(userId, workspaceId) {
  if (!userId || !workspaceId) return;
  const db = await openDatabase();
  try {
    const tx = db.transaction(SNAPSHOTS, "readwrite");
    tx.objectStore(SNAPSHOTS).delete(String(userId) + ":" + String(workspaceId));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Could not clear device data."));
      tx.onabort = () => reject(tx.error || new Error("Device database transaction was cancelled."));
    });
  } finally {
    db.close();
  }
}

export async function enqueueOfflineMutation({ userId, workspaceId, endpoint, method, body }) {
  const db = await openDatabase();
  const record = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2),
    user_id: String(userId),
    workspace_id: String(workspaceId),
    endpoint,
    method: method || "POST",
    body,
    created_at: new Date().toISOString(),
    state: "pending",
  };
  try {
    const tx = db.transaction(OUTBOX, "readwrite");
    tx.objectStore(OUTBOX).put(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Could not queue the offline change."));
      tx.onabort = () => reject(tx.error || new Error("Offline queue transaction was cancelled."));
    });
    return record;
  } finally {
    db.close();
  }
}

export async function listOfflineMutations(userId, workspaceId) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(OUTBOX, "readonly");
    const all = await requestResult(tx.objectStore(OUTBOX).getAll());
    return all.filter(item => item.user_id === String(userId) && item.workspace_id === String(workspaceId) && item.state === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
  } finally {
    db.close();
  }
}

export async function removeOfflineMutation(id) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(OUTBOX, "readwrite");
    tx.objectStore(OUTBOX).delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Could not remove the synced change."));
      tx.onabort = () => reject(tx.error || new Error("Offline queue transaction was cancelled."));
    });
  } finally {
    db.close();
  }
}
