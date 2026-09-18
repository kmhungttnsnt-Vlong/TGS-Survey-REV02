// ======================================================
// TGS Platform Genesis 2.0
// REV03-003A
// IndexedDB Stable Engine
// ======================================================

const DB_NAME = "TGS_SURVEY_DB";
const DB_VERSION = 2;

let db = null;

const STORES = {
  PROJECTS: "projects"
};

// ------------------------------------------------------
// INIT
// ------------------------------------------------------

function initDatabase() {
  return new Promise((resolve, reject) => {

    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (e) => {

      const database = e.target.result;

      if (!database.objectStoreNames.contains(STORES.PROJECTS)) {

        const store = database.createObjectStore(STORES.PROJECTS, {
          keyPath: "projectId"
        });

        store.createIndex("createdAt", "createdAt");

      }

    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

  });
}

// ------------------------------------------------------
// PROJECT
// ------------------------------------------------------

async function createProject(data) {

  await initDatabase();

  const project = {
    projectId: crypto.randomUUID(),
    projectCode: data.projectCode,
    projectName: data.projectName,
    location: data.location,
    organization: data.organization,
    surveyMode: null,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {

    const tx = db.transaction("projects", "readwrite");

    tx.objectStore("projects").add(project);

    tx.oncomplete = () => resolve(project);

    tx.onerror = () => reject(tx.error);

  });

}

async function updateProject(project) {

  await initDatabase();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("projects", "readwrite");

    tx.objectStore("projects").put(project);

    tx.oncomplete = () => resolve(true);

    tx.onerror = () => reject(tx.error);

  });

}

async function getLatestProject() {

  await initDatabase();

  return new Promise((resolve, reject) => {

    const tx = db.transaction("projects", "readonly");

    const req = tx.objectStore("projects").getAll();

    req.onsuccess = () => {

      const list = req.result;

      if (list.length === 0) {
        resolve(null);
        return;
      }

      list.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      resolve(list[0]);

    };

    req.onerror = () => reject(req.error);

  });

}

// ------------------------------------------------------

window.DB = {
  initDatabase,
  createProject,
  updateProject,
  getLatestProject
};
