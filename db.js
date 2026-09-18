// ======================================================
// TGS Platform Genesis 2.0
// REV03 - IndexedDB Engine
// File: db.js
// ======================================================

const DB_NAME = "TGS_SURVEY_DB";
const DB_VERSION = 1;

let db = null;

const STORES = {
  PROJECTS: "projects",
  SURVEYS: "surveys",
  TIMELINE: "timeline",
  PHOTOS: "photos",
  SEGMENTS: "segments",
  SYNC: "syncQueue"
};

// =============================
// Initialize Database
// =============================
async function initDatabase(){
  return new Promise((resolve,reject)=>{

    const request = indexedDB.open(DB_NAME,DB_VERSION);

    request.onerror = ()=>reject(request.error);

    request.onsuccess = ()=>{
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event)=>{

      const database = event.target.result;

      if(!database.objectStoreNames.contains(STORES.PROJECTS)){
        const store = database.createObjectStore(STORES.PROJECTS,{ keyPath:"projectId" });
        store.createIndex("createdAt","createdAt");
      }

      if(!database.objectStoreNames.contains(STORES.SURVEYS)){
        const store = database.createObjectStore(STORES.SURVEYS,{ keyPath:"surveyId" });
        store.createIndex("projectId","projectId");
      }

      if(!database.objectStoreNames.contains(STORES.TIMELINE)){
        const store = database.createObjectStore(STORES.TIMELINE,{ keyPath:"timelineId" });
        store.createIndex("surveyId","surveyId");
      }

      if(!database.objectStoreNames.contains(STORES.PHOTOS)){
        const store = database.createObjectStore(STORES.PHOTOS,{ keyPath:"photoId" });
        store.createIndex("surveyId","surveyId");
      }

      if(!database.objectStoreNames.contains(STORES.SEGMENTS)){
        const store = database.createObjectStore(STORES.SEGMENTS,{ keyPath:"segmentId" });
        store.createIndex("surveyId","surveyId");
      }

      if(!database.objectStoreNames.contains(STORES.SYNC)){
        const store = database.createObjectStore(STORES.SYNC,{ keyPath:"syncId" });
        store.createIndex("status","status");
      }

    };

  });
}

// =============================
// Generic CRUD
// =============================

function getStore(storeName,mode="readonly"){
  const tx = db.transaction(storeName,mode);
  return tx.objectStore(storeName);
}

async function save(storeName,data){
  return new Promise((resolve,reject)=>{

    const request = getStore(storeName,"readwrite").put(data);

    request.onsuccess = ()=>resolve(true);
    request.onerror = ()=>reject(request.error);

  });
}

async function remove(storeName,key){
  return new Promise((resolve,reject)=>{

    const request = getStore(storeName,"readwrite").delete(key);

    request.onsuccess = ()=>resolve(true);
    request.onerror = ()=>reject(request.error);

  });
}

async function get(storeName,key){
  return new Promise((resolve,reject)=>{

    const request = getStore(storeName).get(key);

    request.onsuccess = ()=>resolve(request.result);
    request.onerror = ()=>reject(request.error);

  });
}

async function getAll(storeName){
  return new Promise((resolve,reject)=>{

    const request = getStore(storeName).getAll();

    request.onsuccess = ()=>resolve(request.result || []);
    request.onerror = ()=>reject(request.error);

  });
}

// =============================
// Project Repository
// =============================

async function createProject(project){

  const data={
    projectId: crypto.randomUUID(),
    projectCode: project.projectCode,
    projectName: project.projectName,
    location: project.location,
    organization: project.organization,
    surveyMode: null,
    createdAt: new Date().toISOString(),
    status:"ACTIVE"
  };

  await save(STORES.PROJECTS,data);

  return data;
}

async function updateProject(project){
  await save(STORES.PROJECTS,project);
}

async function getLatestProject(){

  const list = await getAll(STORES.PROJECTS);

  if(list.length===0) return null;

  list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  return list[0];
}

// =============================
// Sync Queue
// =============================

async function addSyncItem(type,payload){

  const item={
    syncId: crypto.randomUUID(),
    type,
    payload,
    status:"PENDING",
    createdAt:new Date().toISOString()
  };

  await save(STORES.SYNC,item);

  return item;
}

// =============================
// Export Database Snapshot
// =============================

async function exportDatabase(){

  return {
    projects: await getAll(STORES.PROJECTS),
    surveys: await getAll(STORES.SURVEYS),
    timeline: await getAll(STORES.TIMELINE),
    photos: await getAll(STORES.PHOTOS),
    segments: await getAll(STORES.SEGMENTS),
    syncQueue: await getAll(STORES.SYNC)
  };
}

// =============================
// Boot
// =============================

window.DB={
  initDatabase,
  createProject,
  updateProject,
  getLatestProject,
  addSyncItem,
  exportDatabase,
  save,
  get,
  getAll,
  remove,
  STORES
};

initDatabase();
