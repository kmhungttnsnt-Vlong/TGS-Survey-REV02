// ======================================================
// TGS Platform Genesis 2.0
// TGS02-WEB-LINEAR-004
// IndexedDB GIS Foundation
// REV01
//
// Purpose:
// - Preserve existing Project database.
// - Add unified GIS Object store.
// - Prepare WebApp GIS Lab for Digital Twin.
// - Keep GIS objects independent from map provider.
//
// Architecture:
//
// TGS_SURVEY_DB
//   │
//   ├── projects
//   │
//   └── gisObjects
//          ├── pipe
//          ├── valve
//          ├── tee
//          ├── elbow
//          ├── waterStation
//          └── customerMeter
//
// IMPORTANT:
// - Existing project data is preserved.
// - GIS objects belong to a project.
// - layerType determines the GIS class.
// - geometry is provider-independent.
// - No real GIS data is inserted automatically.
// ======================================================


const DB_NAME = "TGS_SURVEY_DB";

const DB_VERSION = 3;


let db = null;


/* ======================================================
   STORES
====================================================== */

const STORES = {

  PROJECTS: "projects",

  GIS_OBJECTS: "gisObjects"

};


/* ======================================================
   GIS LAYER TYPES
====================================================== */

const GIS_LAYER_TYPES = {

  PIPE: "pipe",

  VALVE: "valve",

  TEE: "tee",

  ELBOW: "elbow",

  WATER_STATION: "waterStation",

  CUSTOMER_METER: "customerMeter"

};


/* ======================================================
   INIT DATABASE
====================================================== */

function initDatabase() {

  return new Promise((resolve, reject) => {


    /* --------------------------------------------------
       Existing connection
    -------------------------------------------------- */

    if (db) {

      resolve(db);

      return;

    }


    const request =
      indexedDB.open(
        DB_NAME,
        DB_VERSION
      );


    /* --------------------------------------------------
       ERROR
    -------------------------------------------------- */

    request.onerror = () => {

      reject(
        request.error
      );

    };


    /* --------------------------------------------------
       UPGRADE
    -------------------------------------------------- */

    request.onupgradeneeded = (e) => {

      const database =
        e.target.result;


      /* =================================================
         PROJECTS
      ================================================= */

      if (
        !database.objectStoreNames.contains(
          STORES.PROJECTS
        )
      ) {

        const projectStore =
          database.createObjectStore(
            STORES.PROJECTS,
            {
              keyPath: "projectId"
            }
          );


        projectStore.createIndex(
          "createdAt",
          "createdAt"
        );

      }


      /* =================================================
         GIS OBJECTS
      ================================================= */

      if (
        !database.objectStoreNames.contains(
          STORES.GIS_OBJECTS
        )
      ) {

        const gisStore =
          database.createObjectStore(
            STORES.GIS_OBJECTS,
            {
              keyPath: "objectId"
            }
          );


        /* ------------------------------------------------
           PROJECT INDEX
        ------------------------------------------------ */

        gisStore.createIndex(
          "projectId",
          "projectId"
        );


        /* ------------------------------------------------
           LAYER TYPE INDEX
        ------------------------------------------------ */

        gisStore.createIndex(
          "layerType",
          "layerType"
        );


        /* ------------------------------------------------
           PROJECT + LAYER INDEX
        ------------------------------------------------ */

        gisStore.createIndex(
          "projectLayer",
          [
            "projectId",
            "layerType"
          ]
        );


        /* ------------------------------------------------
           CREATED AT
        ------------------------------------------------ */

        gisStore.createIndex(
          "createdAt",
          "createdAt"
        );

      }

    };


    /* --------------------------------------------------
       SUCCESS
    -------------------------------------------------- */

    request.onsuccess = () => {

      db =
        request.result;


      /*
       * If another browser tab upgrades the database,
       * close this connection so the next operation can
       * reopen it cleanly.
       */

      db.onversionchange = () => {

        db.close();

        db = null;

      };


      resolve(db);

    };

  });

}


/* ======================================================
   PROJECT
====================================================== */

async function createProject(data) {

  await initDatabase();


  const project = {

    projectId:
      crypto.randomUUID(),

    projectCode:
      data.projectCode,

    projectName:
      data.projectName,

    location:
      data.location,

    organization:
      data.organization,

    surveyMode:
      null,

    createdAt:
      new Date().toISOString()

  };


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.PROJECTS,
          "readwrite"
        );


      tx.objectStore(
        STORES.PROJECTS
      ).add(project);


      tx.oncomplete = () => {

        resolve(project);

      };


      tx.onerror = () => {

        reject(
          tx.error
        );

      };

    }
  );

}


/* ======================================================
   UPDATE PROJECT
====================================================== */

async function updateProject(project) {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.PROJECTS,
          "readwrite"
        );


      tx.objectStore(
        STORES.PROJECTS
      ).put(project);


      tx.oncomplete = () => {

        resolve(true);

      };


      tx.onerror = () => {

        reject(
          tx.error
        );

      };

    }
  );

}


/* ======================================================
   GET LATEST PROJECT
====================================================== */

async function getLatestProject() {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.PROJECTS,
          "readonly"
        );


      const request =
        tx.objectStore(
          STORES.PROJECTS
        ).getAll();


      request.onsuccess = () => {

        const list =
          request.result;


        if (
          list.length === 0
        ) {

          resolve(null);

          return;

        }


        list.sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        );


        resolve(
          list[0]
        );

      };


      request.onerror = () => {

        reject(
          request.error
        );

      };

    }
  );

}


/* ======================================================
   GIS OBJECT
======================================================

   Generic GIS object.

   Example:

   {
     objectId: "...",
     projectId: "...",
     layerType: "pipe",

     geometry: {
       type: "LineString",
       coordinates: [
         [106.6601, 10.7626],
         [106.6605, 10.7628]
       ]
     },

     properties: {
       code: "P001",
       name: "Ống DN150"
     },

     createdAt: "...",
     updatedAt: "..."
   }

====================================================== */

async function createGISObject(data) {

  await initDatabase();


  if (
    !data.projectId
  ) {

    throw new Error(
      "GIS object requires projectId."
    );

  }


  if (
    !data.layerType
  ) {

    throw new Error(
      "GIS object requires layerType."
    );

  }


  const gisObject = {

    objectId:
      data.objectId ||
      crypto.randomUUID(),

    projectId:
      data.projectId,

    layerType:
      data.layerType,

    geometry:
      data.geometry ||
      null,

    properties:
      data.properties ||
      {},

    status:
      data.status ||
      "ACTIVE",

    createdAt:
      data.createdAt ||
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readwrite"
        );


      tx.objectStore(
        STORES.GIS_OBJECTS
      ).add(gisObject);


      tx.oncomplete = () => {

        resolve(
          gisObject
        );

      };


      tx.onerror = () => {

        reject(
          tx.error
        );

      };

    }
  );

}


/* ======================================================
   UPDATE GIS OBJECT
====================================================== */

async function updateGISObject(gisObject) {

  await initDatabase();


  if (
    !gisObject ||
    !gisObject.objectId
  ) {

    throw new Error(
      "GIS objectId is required."
    );

  }


  gisObject.updatedAt =
    new Date().toISOString();


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readwrite"
        );


      tx.objectStore(
        STORES.GIS_OBJECTS
      ).put(gisObject);


      tx.oncomplete = () => {

        resolve(
          gisObject
        );

      };


      tx.onerror = () => {

        reject(
          tx.error
        );

      };

    }
  );

}


/* ======================================================
   GET GIS OBJECT
====================================================== */

async function getGISObject(objectId) {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readonly"
        );


      const request =
        tx.objectStore(
          STORES.GIS_OBJECTS
        ).get(objectId);


      request.onsuccess = () => {

        resolve(
          request.result ||
          null
        );

      };


      request.onerror = () => {

        reject(
          request.error
        );

      };

    }
  );

}


/* ======================================================
   GET GIS OBJECTS BY PROJECT
====================================================== */

async function getGISObjectsByProject(
  projectId
) {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readonly"
        );


      const index =
        tx.objectStore(
          STORES.GIS_OBJECTS
        ).index(
          "projectId"
        );


      const request =
        index.getAll(
          projectId
        );


      request.onsuccess = () => {

        resolve(
          request.result
        );

      };


      request.onerror = () => {

        reject(
          request.error
        );

      };

    }
  );

}


/* ======================================================
   GET GIS OBJECTS BY LAYER
====================================================== */

async function getGISObjectsByLayer(
  projectId,
  layerType
) {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readonly"
        );


      const index =
        tx.objectStore(
          STORES.GIS_OBJECTS
        ).index(
          "projectLayer"
        );


      const request =
        index.getAll(
          [
            projectId,
            layerType
          ]
        );


      request.onsuccess = () => {

        resolve(
          request.result
        );

      };


      request.onerror = () => {

        reject(
          request.error
        );

      };

    }
  );

}


/* ======================================================
   DELETE GIS OBJECT
====================================================== */

async function deleteGISObject(
  objectId
) {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {


      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readwrite"
        );


      tx.objectStore(
        STORES.GIS_OBJECTS
      ).delete(
        objectId
      );


      tx.oncomplete = () => {

        resolve(true);

      };


      tx.onerror = () => {

        reject(
          tx.error
        );

      };

    }
  );

}


/* ======================================================
   GET GIS LAYER TYPES
====================================================== */

function getGISLayerTypes() {

  return {
    ...GIS_LAYER_TYPES
  };

}


/* ======================================================
   PUBLIC API
====================================================== */

window.DB = {

  /* Database */

  initDatabase,


  /* Project */

  createProject,

  updateProject,

  getLatestProject,


  /* GIS */

  createGISObject,

  updateGISObject,

  getGISObject,

  getGISObjectsByProject,

  getGISObjectsByLayer,

  deleteGISObject,

  getGISLayerTypes

};
