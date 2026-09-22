/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   TGS-SURVEY-REV02
   db.js
   FOUNDATION REV01

   DATABASE FOUNDATION
   ----------------------------------------------------------
   DB Name      : TGS_SURVEY_DB
   DB Version   : 4

   Stores:
   1. projects
   2. surveys
   3. gisObjects
   4. evidence
   5. timeline

   PRINCIPLES
   ----------------------------------------------------------
   ✓ Offline First
   ✓ IndexedDB
   ✓ Project is parent entity
   ✓ Survey belongs to Project
   ✓ GIS Object belongs to Project
   ✓ Evidence belongs to Project / Survey / Object
   ✓ Timeline records survey events
   ✓ No synthetic GIS seed
   ✓ Existing REV03 data preserved
   ✓ Export-ready Survey Evidence Package
========================================================== */

"use strict";


/* ==========================================================
   DATABASE CONFIGURATION
========================================================== */

const DB_NAME = "TGS_SURVEY_DB";

const DB_VERSION = 4;


/* ==========================================================
   STORE DEFINITIONS
========================================================== */

const STORES = {

  PROJECTS: "projects",

  SURVEYS: "surveys",

  GIS_OBJECTS: "gisObjects",

  EVIDENCE: "evidence",

  TIMELINE: "timeline"

};


/* ==========================================================
   PROJECT STATUS
========================================================== */

const PROJECT_STATUS = {

  DRAFT: "draft",

  COMPLETED: "completed"

};


/* ==========================================================
   SURVEY STATUS
========================================================== */

const SURVEY_STATUS = {

  DRAFT: "draft",

  ACTIVE: "active",

  PAUSED: "paused",

  COMPLETED: "completed"

};


/* ==========================================================
   GIS STATUS
========================================================== */

const GIS_STATUS = {

  ACTIVE: "active",

  DELETED: "deleted",

  REVIEW: "review"

};


/* ==========================================================
   DATABASE STATE
========================================================== */

let dbInstance = null;


/* ==========================================================
   INTERNAL UTILITIES
========================================================== */

function generateId(prefix) {

  const randomPart =
    typeof crypto !== "undefined" &&
    crypto.randomUUID
      ? crypto.randomUUID()
      : (
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2)
        );

  return prefix
    ? `${prefix}-${randomPart}`
    : randomPart;

}


function nowISO() {

  return new Date().toISOString();

}


function cloneObject(value) {

  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));

}


function ensureObject(value, name) {

  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {

    throw new Error(
      `${name} phải là object hợp lệ.`
    );

  }

}


function ensureRequired(value, fieldName) {

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {

    throw new Error(
      `Thiếu trường bắt buộc: ${fieldName}`
    );

  }

}


/* ==========================================================
   INDEXEDDB REQUEST HELPER
========================================================== */

function requestToPromise(request) {

  return new Promise((resolve, reject) => {

    request.onsuccess = () => {

      resolve(request.result);

    };

    request.onerror = () => {

      reject(request.error);

    };

  });

}


function transactionToPromise(transaction) {

  return new Promise((resolve, reject) => {

    transaction.oncomplete = () => {

      resolve();

    };

    transaction.onerror = () => {

      reject(transaction.error);

    };

    transaction.onabort = () => {

      reject(
        transaction.error ||
        new Error("IndexedDB transaction aborted.")
      );

    };

  });

}


/* ==========================================================
   DATABASE INITIALIZATION
========================================================== */

function initDatabase() {

  if (dbInstance) {

    return Promise.resolve(dbInstance);

  }


  if (!window.indexedDB) {

    return Promise.reject(
      new Error(
        "Thiết bị hoặc trình duyệt không hỗ trợ IndexedDB."
      )
    );

  }


  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(
        DB_NAME,
        DB_VERSION
      );


    /* ------------------------------------------------------
       DATABASE UPGRADE
    ------------------------------------------------------ */

    request.onupgradeneeded = (event) => {

      const db = request.result;

      const oldVersion =
        event.oldVersion || 0;


      console.log(
        `[TGS DB] Upgrade ${oldVersion} → ${DB_VERSION}`
      );


      /* ====================================================
         VERSION 1 / PROJECTS
      ==================================================== */

      if (!db.objectStoreNames.contains(
        STORES.PROJECTS
      )) {

        const projects =
          db.createObjectStore(
            STORES.PROJECTS,
            {
              keyPath: "projectId"
            }
          );


        projects.createIndex(
          "projectCode",
          "projectCode",
          {
            unique: false
          }
        );


        projects.createIndex(
          "status",
          "status",
          {
            unique: false
          }
        );


        projects.createIndex(
          "createdAt",
          "createdAt",
          {
            unique: false
          }
        );


        projects.createIndex(
          "updatedAt",
          "updatedAt",
          {
            unique: false
          }
        );

      }


      /* ====================================================
         VERSION 3 / GIS OBJECTS
      ==================================================== */

      if (!db.objectStoreNames.contains(
        STORES.GIS_OBJECTS
      )) {

        const gisObjects =
          db.createObjectStore(
            STORES.GIS_OBJECTS,
            {
              keyPath: "objectId"
            }
          );


        gisObjects.createIndex(
          "projectId",
          "projectId",
          {
            unique: false
          }
        );


        gisObjects.createIndex(
          "layerType",
          "layerType",
          {
            unique: false
          }
        );


        gisObjects.createIndex(
          "projectLayer",
          [
            "projectId",
            "layerType"
          ],
          {
            unique: false
          }
        );


        gisObjects.createIndex(
          "createdAt",
          "createdAt",
          {
            unique: false
          }
        );


        gisObjects.createIndex(
          "updatedAt",
          "updatedAt",
          {
            unique: false
          }
        );


        gisObjects.createIndex(
          "status",
          "status",
          {
            unique: false
          }
        );

      }


      /* ====================================================
         VERSION 4 / SURVEYS
      ==================================================== */

      if (!db.objectStoreNames.contains(
        STORES.SURVEYS
      )) {

        const surveys =
          db.createObjectStore(
            STORES.SURVEYS,
            {
              keyPath: "surveyId"
            }
          );


        surveys.createIndex(
          "projectId",
          "projectId",
          {
            unique: false
          }
        );


        surveys.createIndex(
          "surveyType",
          "surveyType",
          {
            unique: false
          }
        );


        surveys.createIndex(
          "status",
          "status",
          {
            unique: false
          }
        );


        surveys.createIndex(
          "projectStatus",
          [
            "projectId",
            "status"
          ],
          {
            unique: false
          }
        );


        surveys.createIndex(
          "createdAt",
          "createdAt",
          {
            unique: false
          }
        );


        surveys.createIndex(
          "updatedAt",
          "updatedAt",
          {
            unique: false
          }
        );

      }


      /* ====================================================
         VERSION 4 / EVIDENCE
      ==================================================== */

      if (!db.objectStoreNames.contains(
        STORES.EVIDENCE
      )) {

        const evidence =
          db.createObjectStore(
            STORES.EVIDENCE,
            {
              keyPath: "evidenceId"
            }
          );


        evidence.createIndex(
          "projectId",
          "projectId",
          {
            unique: false
          }
        );


        evidence.createIndex(
          "surveyId",
          "surveyId",
          {
            unique: false
          }
        );


        evidence.createIndex(
          "objectId",
          "objectId",
          {
            unique: false
          }
        );


        evidence.createIndex(
          "evidenceType",
          "evidenceType",
          {
            unique: false
          }
        );


        evidence.createIndex(
          "capturedAt",
          "capturedAt",
          {
            unique: false
          }
        );


        evidence.createIndex(
          "createdAt",
          "createdAt",
          {
            unique: false
          }
        );

      }


      /* ====================================================
         VERSION 4 / TIMELINE
      ==================================================== */

      if (!db.objectStoreNames.contains(
        STORES.TIMELINE
      )) {

        const timeline =
          db.createObjectStore(
            STORES.TIMELINE,
            {
              keyPath: "eventId"
            }
          );


        timeline.createIndex(
          "projectId",
          "projectId",
          {
            unique: false
          }
        );


        timeline.createIndex(
          "surveyId",
          "surveyId",
          {
            unique: false
          }
        );


        timeline.createIndex(
          "objectId",
          "objectId",
          {
            unique: false
          }
        );


        timeline.createIndex(
          "eventType",
          "eventType",
          {
            unique: false
          }
        );


        timeline.createIndex(
          "timestamp",
          "timestamp",
          {
            unique: false
          }
        );


        timeline.createIndex(
          "projectSurveyTime",
          [
            "projectId",
            "surveyId",
            "timestamp"
          ],
          {
            unique: false
          }
        );

      }

    };


    /* ------------------------------------------------------
       SUCCESS
    ------------------------------------------------------ */

    request.onsuccess = () => {

      dbInstance = request.result;


      dbInstance.onversionchange = () => {

        dbInstance.close();

        dbInstance = null;

      };


      console.log(
        `[TGS DB] ${DB_NAME} v${DB_VERSION} READY`
      );


      resolve(dbInstance);

    };


    /* ------------------------------------------------------
       ERROR
    ------------------------------------------------------ */

    request.onerror = () => {

      reject(request.error);

    };


    request.onblocked = () => {

      console.warn(
        "[TGS DB] Upgrade blocked. " +
        "Đang có một connection cũ mở."
      );

    };

  });

}


/* ==========================================================
   ENSURE DATABASE
========================================================== */

async function ensureDB() {

  if (!dbInstance) {

    await initDatabase();

  }

  return dbInstance;

}


/* ==========================================================
   GENERIC GET
========================================================== */

async function getById(
  storeName,
  id
) {

  ensureRequired(id, "id");

  const db = await ensureDB();

  const tx =
    db.transaction(
      storeName,
      "readonly"
    );

  const store =
    tx.objectStore(storeName);

  return requestToPromise(
    store.get(id)
  );

}


/* ==========================================================
   GENERIC GET ALL
========================================================== */

async function getAll(
  storeName
) {

  const db = await ensureDB();

  const tx =
    db.transaction(
      storeName,
      "readonly"
    );

  const store =
    tx.objectStore(storeName);

  return requestToPromise(
    store.getAll()
  );

}


/* ==========================================================
   GENERIC PUT
========================================================== */

async function putRecord(
  storeName,
  record
) {

  ensureObject(
    record,
    "record"
  );

  const db = await ensureDB();

  const tx =
    db.transaction(
      storeName,
      "readwrite"
    );

  const store =
    tx.objectStore(storeName);

  const request =
    store.put(record);

  await requestToPromise(request);

  await transactionToPromise(tx);

  return cloneObject(record);

}


/* ==========================================================
   GENERIC DELETE
========================================================== */

async function deleteRecord(
  storeName,
  id
) {

  ensureRequired(id, "id");

  const db = await ensureDB();

  const tx =
    db.transaction(
      storeName,
      "readwrite"
    );

  const store =
    tx.objectStore(storeName);

  store.delete(id);

  await transactionToPromise(tx);

  return true;

}


/* ==========================================================
   PROJECT — CREATE
========================================================== */

async function createProject(data) {

  ensureObject(
    data,
    "project data"
  );


  ensureRequired(
    data.projectName,
    "projectName"
  );


  ensureRequired(
    data.projectCode,
    "projectCode"
  );


  const timestamp =
    nowISO();


  const project = {

    projectId:
      data.projectId ||
      generateId("project"),

    projectName:
      String(data.projectName).trim(),

    projectCode:
      String(data.projectCode).trim(),

    location:
      data.location
        ? String(data.location).trim()
        : "",

    organization:
      data.organization
        ? String(data.organization).trim()
        : "",

    province:
      data.province || "",

    centralMeridian:
      data.centralMeridian ?? null,

    zone:
      data.zone ?? null,

    status:
      data.status ||
      PROJECT_STATUS.DRAFT,

    createdAt:
      data.createdAt ||
      timestamp,

    updatedAt:
      timestamp,

    completedAt:
      data.completedAt ||
      null,

    metadata:
      data.metadata
        ? cloneObject(data.metadata)
        : {}

  };


  return putRecord(
    STORES.PROJECTS,
    project
  );

}


/* ==========================================================
   PROJECT — UPDATE
========================================================== */

async function updateProject(
  project
) {

  ensureObject(
    project,
    "project"
  );


  ensureRequired(
    project.projectId,
    "projectId"
  );


  const existing =
    await getById(
      STORES.PROJECTS,
      project.projectId
    );


  if (!existing) {

    throw new Error(
      `Không tìm thấy project: ${project.projectId}`
    );

  }


  const updated = {

    ...existing,

    ...cloneObject(project),

    updatedAt:
      nowISO()

  };


  return putRecord(
    STORES.PROJECTS,
    updated
  );

}


/* ==========================================================
   PROJECT — GET
========================================================== */

async function getProject(
  projectId
) {

  return getById(
    STORES.PROJECTS,
    projectId
  );

}


/* ==========================================================
   PROJECT — GET ALL
========================================================== */

async function getAllProjects() {

  const projects =
    await getAll(
      STORES.PROJECTS
    );


  return projects.sort(
    (a, b) => {

      const ta =
        new Date(
          a.updatedAt ||
          a.createdAt ||
          0
        ).getTime();

      const tb =
        new Date(
          b.updatedAt ||
          b.createdAt ||
          0
        ).getTime();

      return tb - ta;

    }
  );

}


/* ==========================================================
   PROJECT — GET DRAFT
========================================================== */

async function getDraftProject() {

  const projects =
    await getAllProjects();


  const drafts =
    projects.filter(
      project =>
        project.status ===
        PROJECT_STATUS.DRAFT
    );


  return drafts.length
    ? drafts[0]
    : null;

}


/* ==========================================================
   PROJECT — GET SAVED
========================================================== */

async function getSavedProjects() {

  const projects =
    await getAllProjects();


  return projects.filter(
    project =>
      project.status ===
      PROJECT_STATUS.COMPLETED
  );

}


/* ==========================================================
   PROJECT — DELETE
========================================================== */

async function deleteProject(
  projectId
) {

  ensureRequired(
    projectId,
    "projectId"
  );


  const db =
    await ensureDB();


  const stores = [
    STORES.PROJECTS,
    STORES.SURVEYS,
    STORES.GIS_OBJECTS,
    STORES.EVIDENCE,
    STORES.TIMELINE
  ];


  const tx =
    db.transaction(
      stores,
      "readwrite"
    );


  tx.objectStore(
    STORES.PROJECTS
  ).delete(projectId);


  /* --------------------------------------------------------
     DELETE CHILD RECORDS
  -------------------------------------------------------- */

  const surveys =
    await requestToPromise(
      tx.objectStore(
        STORES.SURVEYS
      ).index("projectId").getAll(projectId)
    );


  const gisObjects =
    await requestToPromise(
      tx.objectStore(
        STORES.GIS_OBJECTS
      ).index("projectId").getAll(projectId)
    );


  const evidence =
    await requestToPromise(
      tx.objectStore(
        STORES.EVIDENCE
      ).index("projectId").getAll(projectId)
    );


  const timeline =
    await requestToPromise(
      tx.objectStore(
        STORES.TIMELINE
      ).index("projectId").getAll(projectId)
    );


  surveys.forEach(
    item =>
      tx.objectStore(
        STORES.SURVEYS
      ).delete(item.surveyId)
  );


  gisObjects.forEach(
    item =>
      tx.objectStore(
        STORES.GIS_OBJECTS
      ).delete(item.objectId)
  );


  evidence.forEach(
    item =>
      tx.objectStore(
        STORES.EVIDENCE
      ).delete(item.evidenceId)
  );


  timeline.forEach(
    item =>
      tx.objectStore(
        STORES.TIMELINE
      ).delete(item.eventId)
  );


  await transactionToPromise(tx);

  return true;

}


/* ==========================================================
   SURVEY — CREATE
========================================================== */

async function createSurvey(
  data
) {

  ensureObject(
    data,
    "survey data"
  );


  ensureRequired(
    data.projectId,
    "projectId"
  );


  ensureRequired(
    data.surveyType,
    "surveyType"
  );


  const project =
    await getProject(
      data.projectId
    );


  if (!project) {

    throw new Error(
      `Project không tồn tại: ${data.projectId}`
    );

  }


  const timestamp =
    nowISO();


  const survey = {

    surveyId:
      data.surveyId ||
      generateId("survey"),

    projectId:
      data.projectId,

    surveyType:
      data.surveyType,

    status:
      data.status ||
      SURVEY_STATUS.DRAFT,

    name:
      data.name || "",

    startedAt:
      data.startedAt || null,

    completedAt:
      data.completedAt || null,

    createdAt:
      data.createdAt ||
      timestamp,

    updatedAt:
      timestamp,

    metadata:
      data.metadata
        ? cloneObject(data.metadata)
        : {}

  };


  const result =
    await putRecord(
      STORES.SURVEYS,
      survey
    );


  await createTimelineEvent({

    projectId:
      survey.projectId,

    surveyId:
      survey.surveyId,

    eventType:
      "SURVEY_CREATED",

    data: {

      surveyType:
        survey.surveyType

    }

  });


  return result;

}


/* ==========================================================
   SURVEY — UPDATE
========================================================== */

async function updateSurvey(
  survey
) {

  ensureObject(
    survey,
    "survey"
  );


  ensureRequired(
    survey.surveyId,
    "surveyId"
  );


  const existing =
    await getSurvey(
      survey.surveyId
    );


  if (!existing) {

    throw new Error(
      `Không tìm thấy survey: ${survey.surveyId}`
    );

  }


  const updated = {

    ...existing,

    ...cloneObject(survey),

    updatedAt:
      nowISO()

  };


  return putRecord(
    STORES.SURVEYS,
    updated
  );

}


/* ==========================================================
   SURVEY — GET
========================================================== */

async function getSurvey(
  surveyId
) {

  return getById(
    STORES.SURVEYS,
    surveyId
  );

}


/* ==========================================================
   SURVEY — GET BY PROJECT
========================================================== */

async function getSurveysByProject(
  projectId
) {

  ensureRequired(
    projectId,
    "projectId"
  );


  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.SURVEYS,
      "readonly"
    );


  const index =
    tx.objectStore(
      STORES.SURVEYS
    ).index("projectId");


  const result =
    await requestToPromise(
      index.getAll(projectId)
    );


  return result.sort(
    (a, b) =>
      new Date(
        a.createdAt || 0
      ) -
      new Date(
        b.createdAt || 0
      )
  );

}


/* ==========================================================
   SURVEY — DELETE
========================================================== */

async function deleteSurvey(
  surveyId
) {

  const survey =
    await getSurvey(
      surveyId
    );


  if (!survey) {
    return false;
  }


  const db =
    await ensureDB();


  const stores = [
    STORES.SURVEYS,
    STORES.EVIDENCE,
    STORES.TIMELINE
  ];


  const tx =
    db.transaction(
      stores,
      "readwrite"
    );


  tx.objectStore(
    STORES.SURVEYS
  ).delete(surveyId);


  const evidence =
    await requestToPromise(
      tx.objectStore(
        STORES.EVIDENCE
      ).index("surveyId").getAll(surveyId)
    );


  const timeline =
    await requestToPromise(
      tx.objectStore(
        STORES.TIMELINE
      ).index("surveyId").getAll(surveyId)
    );


  evidence.forEach(
    item =>
      tx.objectStore(
        STORES.EVIDENCE
      ).delete(item.evidenceId)
  );


  timeline.forEach(
    item =>
      tx.objectStore(
        STORES.TIMELINE
      ).delete(item.eventId)
  );


  await transactionToPromise(tx);

  return true;

}


/* ==========================================================
   GIS OBJECT — CREATE
========================================================== */

async function createGISObject(
  data
) {

  ensureObject(
    data,
    "GIS object"
  );


  ensureRequired(
    data.projectId,
    "projectId"
  );


  ensureRequired(
    data.layerType,
    "layerType"
  );


  if (
    data.geometry === undefined ||
    data.geometry === null
  ) {

    throw new Error(
      "GIS object phải có geometry."
    );

  }


  const project =
    await getProject(
      data.projectId
    );


  if (!project) {

    throw new Error(
      `Project không tồn tại: ${data.projectId}`
    );

  }


  const timestamp =
    nowISO();


  const object = {

    objectId:
      data.objectId ||
      generateId("gis"),

    projectId:
      data.projectId,

    surveyId:
      data.surveyId ||
      null,

    layerType:
      data.layerType,

    geometry:
      cloneObject(data.geometry),

    properties:
      data.properties
        ? cloneObject(data.properties)
        : {},

    status:
      data.status ||
      GIS_STATUS.ACTIVE,

    createdAt:
      data.createdAt ||
      timestamp,

    updatedAt:
      timestamp

  };


  const result =
    await putRecord(
      STORES.GIS_OBJECTS,
      object
    );


  if (object.surveyId) {

    await createTimelineEvent({

      projectId:
        object.projectId,

      surveyId:
        object.surveyId,

      objectId:
        object.objectId,

      eventType:
        "GIS_OBJECT_CREATED",

      data: {

        layerType:
          object.layerType

      }

    });

  }


  return result;

}


/* ==========================================================
   GIS OBJECT — UPDATE
========================================================== */

async function updateGISObject(
  object
) {

  ensureObject(
    object,
    "GIS object"
  );


  ensureRequired(
    object.objectId,
    "objectId"
  );


  const existing =
    await getGISObject(
      object.objectId
    );


  if (!existing) {

    throw new Error(
      `Không tìm thấy GIS object: ${object.objectId}`
    );

  }


  const updated = {

    ...existing,

    ...cloneObject(object),

    updatedAt:
      nowISO()

  };


  return putRecord(
    STORES.GIS_OBJECTS,
    updated
  );

}


/* ==========================================================
   GIS OBJECT — GET
========================================================== */

async function getGISObject(
  objectId
) {

  return getById(
    STORES.GIS_OBJECTS,
    objectId
  );

}


/* ==========================================================
   GIS OBJECT — GET BY PROJECT
========================================================== */

async function getGISObjectsByProject(
  projectId
) {

  ensureRequired(
    projectId,
    "projectId"
  );


  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.GIS_OBJECTS,
      "readonly"
    );


  const index =
    tx.objectStore(
      STORES.GIS_OBJECTS
    ).index("projectId");


  return requestToPromise(
    index.getAll(projectId)
  );

}


/* ==========================================================
   GIS OBJECT — GET BY LAYER
========================================================== */

async function getGISObjectsByLayer(
  projectId,
  layerType
) {

  ensureRequired(
    projectId,
    "projectId"
  );


  ensureRequired(
    layerType,
    "layerType"
  );


  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.GIS_OBJECTS,
      "readonly"
    );


  const index =
    tx.objectStore(
      STORES.GIS_OBJECTS
    ).index("projectLayer");


  return requestToPromise(
    index.getAll([
      projectId,
      layerType
    ])
  );

}


/* ==========================================================
   GIS OBJECT — GET LAYER TYPES
========================================================== */

async function getGISLayerTypes(
  projectId
) {

  const objects =
    await getGISObjectsByProject(
      projectId
    );


  const types =
    new Set();


  objects.forEach(
    object => {

      if (object.layerType) {

        types.add(
          object.layerType
        );

      }

    }
  );


  return Array.from(types).sort();

}


/* ==========================================================
   GIS OBJECT — DELETE
========================================================== */

async function deleteGISObject(
  objectId
) {

  return deleteRecord(
    STORES.GIS_OBJECTS,
    objectId
  );

}


/* ==========================================================
   GIS OBJECT — DELETE PROJECT
========================================================== */

async function deleteGISObjectsByProject(
  projectId
) {

  const objects =
    await getGISObjectsByProject(
      projectId
    );


  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.GIS_OBJECTS,
      "readwrite"
    );


  const store =
    tx.objectStore(
      STORES.GIS_OBJECTS
    );


  objects.forEach(
    object =>
      store.delete(
        object.objectId
      )
  );


  await transactionToPromise(tx);

  return true;

}


/* ==========================================================
   EVIDENCE — CREATE
========================================================== */

async function createEvidence(
  data
) {

  ensureObject(
    data,
    "evidence"
  );


  ensureRequired(
    data.projectId,
    "projectId"
  );


  ensureRequired(
    data.evidenceType,
    "evidenceType"
  );


  const project =
    await getProject(
      data.projectId
    );


  if (!project) {

    throw new Error(
      `Project không tồn tại: ${data.projectId}`
    );

  }


  if (data.surveyId) {

    const survey =
      await getSurvey(
        data.surveyId
      );


    if (!survey) {

      throw new Error(
        `Survey không tồn tại: ${data.surveyId}`
      );

    }

  }


  const timestamp =
    nowISO();


  const evidence = {

    evidenceId:
      data.evidenceId ||
      generateId("evidence"),

    projectId:
      data.projectId,

    surveyId:
      data.surveyId ||
      null,

    objectId:
      data.objectId ||
      null,

    evidenceType:
      data.evidenceType,

    fileName:
      data.fileName ||
      "",

    mimeType:
      data.mimeType ||
      "",

    fileSize:
      data.fileSize ??
      null,

    capturedAt:
      data.capturedAt ||
      timestamp,

    latitude:
      data.latitude ??
      null,

    longitude:
      data.longitude ??
      null,

    accuracy:
      data.accuracy ??
      null,

    altitude:
      data.altitude ??
      null,

    note:
      data.note ||
      "",

    metadata:
      data.metadata
        ? cloneObject(data.metadata)
        : {},

    /*
      Binary payload is intentionally optional.

      IndexedDB can store Blob.
      Export engine can later decide
      whether to package binary evidence
      separately from JSON metadata.
    */

    blob:
      data.blob ||
      null,

    dataUrl:
      data.dataUrl ||
      null,

    createdAt:
      data.createdAt ||
      timestamp,

    updatedAt:
      timestamp

  };


  const result =
    await putRecord(
      STORES.EVIDENCE,
      evidence
    );


  if (evidence.surveyId) {

    await createTimelineEvent({

      projectId:
        evidence.projectId,

      surveyId:
        evidence.surveyId,

      objectId:
        evidence.objectId,

      eventType:
        "EVIDENCE_CREATED",

      data: {

        evidenceId:
          evidence.evidenceId,

        evidenceType:
          evidence.evidenceType

      }

    });

  }


  return result;

}


/* ==========================================================
   EVIDENCE — UPDATE
========================================================== */

async function updateEvidence(
  evidence
) {

  ensureObject(
    evidence,
    "evidence"
  );


  ensureRequired(
    evidence.evidenceId,
    "evidenceId"
  );


  const existing =
    await getEvidence(
      evidence.evidenceId
    );


  if (!existing) {

    throw new Error(
      `Không tìm thấy evidence: ${evidence.evidenceId}`
    );

  }


  const updated = {

    ...existing,

    ...evidence,

    updatedAt:
      nowISO()

  };


  return putRecord(
    STORES.EVIDENCE,
    updated
  );

}


/* ==========================================================
   EVIDENCE — GET
========================================================== */

async function getEvidence(
  evidenceId
) {

  return getById(
    STORES.EVIDENCE,
    evidenceId
  );

}


/* ==========================================================
   EVIDENCE — GET PROJECT
========================================================== */

async function getEvidenceByProject(
  projectId
) {

  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.EVIDENCE,
      "readonly"
    );


  return requestToPromise(
    tx.objectStore(
      STORES.EVIDENCE
    )
    .index("projectId")
    .getAll(projectId)
  );

}


/* ==========================================================
   EVIDENCE — GET SURVEY
========================================================== */

async function getEvidenceBySurvey(
  surveyId
) {

  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.EVIDENCE,
      "readonly"
    );


  return requestToPromise(
    tx.objectStore(
      STORES.EVIDENCE
    )
    .index("surveyId")
    .getAll(surveyId)
  );

}


/* ==========================================================
   EVIDENCE — GET OBJECT
========================================================== */

async function getEvidenceByObject(
  objectId
) {

  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.EVIDENCE,
      "readonly"
    );


  return requestToPromise(
    tx.objectStore(
      STORES.EVIDENCE
    )
    .index("objectId")
    .getAll(objectId)
  );

}


/* ==========================================================
   EVIDENCE — DELETE
========================================================== */

async function deleteEvidence(
  evidenceId
) {

  return deleteRecord(
    STORES.EVIDENCE,
    evidenceId
  );

}


/* ==========================================================
   TIMELINE — CREATE
========================================================== */

async function createTimelineEvent(
  data
) {

  ensureObject(
    data,
    "timeline event"
  );


  ensureRequired(
    data.projectId,
    "projectId"
  );


  ensureRequired(
    data.eventType,
    "eventType"
  );


  const timestamp =
    data.timestamp ||
    nowISO();


  const event = {

    eventId:
      data.eventId ||
      generateId("event"),

    projectId:
      data.projectId,

    surveyId:
      data.surveyId ||
      null,

    objectId:
      data.objectId ||
      null,

    eventType:
      data.eventType,

    timestamp,

    data:
      data.data
        ? cloneObject(data.data)
        : {},

    createdAt:
      data.createdAt ||
      timestamp

  };


  return putRecord(
    STORES.TIMELINE,
    event
  );

}


/* ==========================================================
   TIMELINE — GET PROJECT
========================================================== */

async function getTimelineByProject(
  projectId
) {

  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.TIMELINE,
      "readonly"
    );


  const result =
    await requestToPromise(
      tx.objectStore(
        STORES.TIMELINE
      )
      .index("projectId")
      .getAll(projectId)
    );


  return result.sort(
    (a, b) =>
      new Date(
        a.timestamp || 0
      ) -
      new Date(
        b.timestamp || 0
      )
  );

}


/* ==========================================================
   TIMELINE — GET SURVEY
========================================================== */

async function getTimelineBySurvey(
  surveyId
) {

  const db =
    await ensureDB();


  const tx =
    db.transaction(
      STORES.TIMELINE,
      "readonly"
    );


  const result =
    await requestToPromise(
      tx.objectStore(
        STORES.TIMELINE
      )
      .index("surveyId")
      .getAll(surveyId)
    );


  return result.sort(
    (a, b) =>
      new Date(
        a.timestamp || 0
      ) -
      new Date(
        b.timestamp || 0
      )
  );

}


/* ==========================================================
   TIMELINE — DELETE
========================================================== */

async function deleteTimelineEvent(
  eventId
) {

  return deleteRecord(
    STORES.TIMELINE,
    eventId
  );

}


/* ==========================================================
   SURVEY EVIDENCE PACKAGE
========================================================== */

async function buildSurveyEvidencePackage(
  projectId
) {

  ensureRequired(
    projectId,
    "projectId"
  );


  const project =
    await getProject(
      projectId
    );


  if (!project) {

    throw new Error(
      `Không tìm thấy project: ${projectId}`
    );

  }


  const surveys =
    await getSurveysByProject(
      projectId
    );


  const gisObjects =
    await getGISObjectsByProject(
      projectId
    );


  const evidence =
    await getEvidenceByProject(
      projectId
    );


  const timeline =
    await getTimelineByProject(
      projectId
    );


  const packageObject = {

    manifest: {

      schemaVersion:
        "TGS-SURVEY-2.0",

      packageType:
        "SURVEY_EVIDENCE",

      generatedAt:
        nowISO(),

      source:
        "TGS WebApp Genesis 2.0",

      databaseVersion:
        DB_VERSION

    },


    project:
      cloneObject(project),


    surveys:
      cloneObject(surveys),


    gisObjects:
      cloneObject(gisObjects),


    evidence:
      cloneObject(evidence)
        .map(
          item => {

            /*
              Blob is not converted into JSON payload.
              Metadata remains exportable.
            */

            const copy =
              {
                ...item
              };


            delete copy.blob;


            return copy;

          }
        ),


    timeline:
      cloneObject(timeline),


    qa: {

      projectExists:
        true,

      surveyCount:
        surveys.length,

      gisObjectCount:
        gisObjects.length,

      evidenceCount:
        evidence.length,

      timelineEventCount:
        timeline.length,

      exportedAt:
        nowISO()

    }

  };


  return packageObject;

}


/* ==========================================================
   EXPORT PACKAGE — JSON STRING
========================================================== */

async function exportSurveyPackageJSON(
  projectId
) {

  const packageObject =
    await buildSurveyEvidencePackage(
      projectId
    );


  return JSON.stringify(
    packageObject,
    null,
    2
  );

}


/* ==========================================================
   EXPORT PACKAGE — DOWNLOAD
========================================================== */

async function downloadSurveyPackage(
  projectId
) {

  const project =
    await getProject(
      projectId
    );


  if (!project) {

    throw new Error(
      `Không tìm thấy project: ${projectId}`
    );

  }


  const json =
    await exportSurveyPackageJSON(
      projectId
    );


  const blob =
    new Blob(
      [
        json
      ],
      {
        type:
          "application/json;charset=utf-8"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const safeCode =
    String(
      project.projectCode ||
      project.projectId
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );


  const fileName =
    `TGS-SURVEY-${safeCode}-EVIDENCE.json`;


  const anchor =
    document.createElement("a");


  anchor.href = url;

  anchor.download =
    fileName;

  anchor.style.display =
    "none";


  document.body.appendChild(
    anchor
  );


  anchor.click();


  anchor.remove();


  setTimeout(
    () => {
      URL.revokeObjectURL(url);
    },
    1000
  );


  return {

    fileName,

    size:
      blob.size

  };

}


/* ==========================================================
   DATABASE INFORMATION
========================================================== */

async function getDBInfo() {

  const db =
    await ensureDB();


  const info = {

    name:
      DB_NAME,

    version:
      db.version,

    stores:
      Array.from(
        db.objectStoreNames
      ),

    ready:
      true

  };


  return info;

}


/* ==========================================================
   DATABASE CLEAR
   ----------------------------------------------------------
   QA ONLY
   ----------------------------------------------------------
   Không được gọi tự động.
========================================================== */

async function clearAllDataForQA() {

  const db =
    await ensureDB();


  const stores =
    Array.from(
      db.objectStoreNames
    );


  if (!stores.length) {
    return true;
  }


  const tx =
    db.transaction(
      stores,
      "readwrite"
    );


  stores.forEach(
    storeName => {

      tx.objectStore(
        storeName
      ).clear();

    }
  );


  await transactionToPromise(tx);

  return true;

}


/* ==========================================================
   LEGACY COMPATIBILITY
   ----------------------------------------------------------
   These aliases exist only so older REV10 app.js does not
   immediately fail while the new app.js is being built.

   New app.js MUST use canonical APIs above.
========================================================== */

async function getProjectById(
  projectId
) {

  return getProject(
    projectId
  );

}


async function getAllGISObjects(
  projectId
) {

  return getGISObjectsByProject(
    projectId
  );

}


/* ==========================================================
   DATABASE API
========================================================== */

const DB = {

  /* --------------------------------------------------------
     CORE
  -------------------------------------------------------- */

  initDatabase,

  getDBInfo,


  /* --------------------------------------------------------
     PROJECT
  -------------------------------------------------------- */

  createProject,

  updateProject,

  getProject,

  getProjectById,

  getAllProjects,

  getDraftProject,

  getSavedProjects,

  deleteProject,


  /* --------------------------------------------------------
     SURVEY
  -------------------------------------------------------- */

  createSurvey,

  updateSurvey,

  getSurvey,

  getSurveysByProject,

  deleteSurvey,


  /* --------------------------------------------------------
     GIS
  -------------------------------------------------------- */

  createGISObject,

  updateGISObject,

  getGISObject,

  getGISObjectsByProject,

  getGISObjectsByLayer,

  getGISLayerTypes,

  getAllGISObjects,

  deleteGISObject,

  deleteGISObjectsByProject,


  /* --------------------------------------------------------
     EVIDENCE
  -------------------------------------------------------- */

  createEvidence,

  updateEvidence,

  getEvidence,

  getEvidenceByProject,

  getEvidenceBySurvey,

  getEvidenceByObject,

  deleteEvidence,


  /* --------------------------------------------------------
     TIMELINE
  -------------------------------------------------------- */

  createTimelineEvent,

  getTimelineByProject,

  getTimelineBySurvey,

  deleteTimelineEvent,


  /* --------------------------------------------------------
     EXPORT
  -------------------------------------------------------- */

  buildSurveyEvidencePackage,

  exportSurveyPackageJSON,

  downloadSurveyPackage,


  /* --------------------------------------------------------
     QA
  -------------------------------------------------------- */

  clearAllDataForQA

};


/* ==========================================================
   GLOBAL API
========================================================== */

window.TGS_DB = DB;


/* ==========================================================
   STARTUP LOG
========================================================== */

console.log(
  "=============================================="
);

console.log(
  "TGS PLATFORM GENESIS 2.0"
);

console.log(
  "Database Foundation REV01"
);

console.log(
  `Database : ${DB_NAME}`
);

console.log(
  `Version  : ${DB_VERSION}`
);

console.log(
  "Stores   :",
  Object.values(STORES)
);

console.log(
  "Export   : Survey Evidence Package READY"
);

console.log(
  "=============================================="
);
