/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-003
   db.js
   REV03

   GIS-01 — REAL GIS DATA FOUNDATION

   Purpose:
   - Preserve existing Project Lifecycle data.
   - Preserve IndexedDB database TGS_SURVEY_DB.
   - Preserve DB_VERSION 3.
   - Preserve projects store.
   - Preserve gisObjects store.
   - Prepare GIS persistence for REAL field survey data.
   - No synthetic/demo GIS data is created here.
   - GIS objects belong to exactly one project through projectId.

   IMPORTANT:
   - This file only provides data persistence.
   - It does NOT create fake GIS objects.
   - It does NOT automatically seed any GIS data.
   - Real GIS data will be created by explicit survey actions.
========================================================== */


/* ==========================================================
   DATABASE CONFIGURATION
========================================================== */

const DB_NAME = "TGS_SURVEY_DB";

const DB_VERSION = 3;

let db = null;


/* ==========================================================
   OBJECT STORES
========================================================== */

const STORES = {

  PROJECTS:
    "projects",

  GIS_OBJECTS:
    "gisObjects"

};


/* ==========================================================
   GIS LAYER TYPES
==========================================================

   Registry only.

   These are valid GIS object categories.

   No data is created automatically.

========================================================== */

const GIS_LAYER_TYPES = {

  SURVEY_POINT:
    "surveyPoint",

  SURVEY_ROUTE:
    "surveyRoute",

  PIPE:
    "pipe",

  VALVE:
    "valve",

  TEE:
    "tee",

  ELBOW:
    "elbow",

  WATER_STATION:
    "waterStation",

  CUSTOMER_METER:
    "customerMeter"

};


/* ==========================================================
   DATABASE INITIALIZATION
========================================================== */

function initDatabase() {

  return new Promise(
    (resolve, reject) => {

      /* ----------------------------------------------------
         Already initialized
      ---------------------------------------------------- */

      if (db) {

        resolve(db);

        return;

      }


      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );


      /* ----------------------------------------------------
         OPEN ERROR
      ---------------------------------------------------- */

      request.onerror = () => {

        reject(
          request.error
        );

      };


      /* ----------------------------------------------------
         DATABASE UPGRADE
      ---------------------------------------------------- */

      request.onupgradeneeded = (event) => {

        const database =
          event.target.result;


        /* ==================================================
           PROJECTS STORE
        ================================================== */

        if (
          !database.objectStoreNames.contains(
            STORES.PROJECTS
          )
        ) {

          const projectStore =
            database.createObjectStore(
              STORES.PROJECTS,
              {
                keyPath:
                  "projectId"
              }
            );


          projectStore.createIndex(
            "createdAt",
            "createdAt"
          );


          projectStore.createIndex(
            "updatedAt",
            "updatedAt"
          );


          projectStore.createIndex(
            "status",
            "status"
          );


          projectStore.createIndex(
            "isSaved",
            "isSaved"
          );

        }


        /* ==================================================
           GIS OBJECTS STORE
        ================================================== */

        if (
          !database.objectStoreNames.contains(
            STORES.GIS_OBJECTS
          )
        ) {

          const gisStore =
            database.createObjectStore(
              STORES.GIS_OBJECTS,
              {
                keyPath:
                  "objectId"
              }
            );


          /* ----------------------------------------------
             Project ownership
          ---------------------------------------------- */

          gisStore.createIndex(
            "projectId",
            "projectId"
          );


          /* ----------------------------------------------
             GIS layer type
          ---------------------------------------------- */

          gisStore.createIndex(
            "layerType",
            "layerType"
          );


          /* ----------------------------------------------
             Project + layer
          ---------------------------------------------- */

          gisStore.createIndex(
            "projectLayer",
            [
              "projectId",
              "layerType"
            ]
          );


          /* ----------------------------------------------
             Creation time
          ---------------------------------------------- */

          gisStore.createIndex(
            "createdAt",
            "createdAt"
          );


          /* ----------------------------------------------
             Update time
          ---------------------------------------------- */

          gisStore.createIndex(
            "updatedAt",
            "updatedAt"
          );


          /* ----------------------------------------------
             Status
          ---------------------------------------------- */

          gisStore.createIndex(
            "status",
            "status"
          );

        }

      };


      /* ----------------------------------------------------
         SUCCESS
      ---------------------------------------------------- */

      request.onsuccess = () => {

        db =
          request.result;


        /* ----------------------------------------------
           Database connection error
        ---------------------------------------------- */

        db.onerror = (event) => {

          console.error(
            "TGS IndexedDB Error:",
            event.target.error
          );

        };


        resolve(
          db
        );

      };

    }
  );

}


/* ==========================================================
   PROJECT — CREATE
========================================================== */

async function createProject(
  data
) {

  await initDatabase();


  const now =
    new Date().toISOString();


  const project = {

    projectId:
      crypto.randomUUID(),

    projectCode:
      data.projectCode || "",

    projectName:
      data.projectName || "",

    location:
      data.location || "",

    organization:
      data.organization || "",


    /* ----------------------------------------------------
       Project lifecycle
    ---------------------------------------------------- */

    status:
      data.status ||
      "IN_PROGRESS",

    completed:
      data.completed === true,

    isSaved:
      data.isSaved === true,


    /* ----------------------------------------------------
       Timestamps
    ---------------------------------------------------- */

    createdAt:
      data.createdAt ||
      now,

    updatedAt:
      data.updatedAt ||
      now

  };


  return new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          STORES.PROJECTS,
          "readwrite"
        );


      const store =
        tx.objectStore(
          STORES.PROJECTS
        );


      store.add(
        project
      );


      tx.oncomplete = () => {

        resolve(
          project
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


/* ==========================================================
   PROJECT — UPDATE
========================================================== */

async function updateProject(
  project
) {

  await initDatabase();


  const updatedProject = {

    ...project,

    updatedAt:
      new Date().toISOString()

  };


  return new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          STORES.PROJECTS,
          "readwrite"
        );


      const store =
        tx.objectStore(
          STORES.PROJECTS
        );


      store.put(
        updatedProject
      );


      tx.oncomplete = () => {

        resolve(
          true
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


/* ==========================================================
   PROJECT — GET ALL
========================================================== */

async function getAllProjects() {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          STORES.PROJECTS,
          "readonly"
        );


      const store =
        tx.objectStore(
          STORES.PROJECTS
        );


      const request =
        store.getAll();


      request.onsuccess = () => {

        const list =
          Array.isArray(
            request.result
          )
            ? request.result
            : [];


        list.sort(
          (a, b) => {

            const dateA =
              new Date(
                a.updatedAt ||
                a.createdAt ||
                0
              );


            const dateB =
              new Date(
                b.updatedAt ||
                b.createdAt ||
                0
              );


            return dateB - dateA;

          }
        );


        resolve(
          list
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


/* ==========================================================
   PROJECT — GET LATEST
========================================================== */

async function getLatestProject() {

  const projects =
    await getAllProjects();


  if (
    projects.length === 0
  ) {

    return null;

  }


  return projects[0];

}


/* ==========================================================
   PROJECT — GET BY ID
========================================================== */

async function getProject(
  projectId
) {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          STORES.PROJECTS,
          "readonly"
        );


      const store =
        tx.objectStore(
          STORES.PROJECTS
        );


      const request =
        store.get(
          projectId
        );


      request.onsuccess = () => {

        resolve(
          request.result || null
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


/* ==========================================================
   GIS OBJECT — NORMALIZE
==========================================================

   This function prepares the common GIS object envelope.

   Geometry:
     {
       type: "Point" | "LineString" | "Polygon",
       coordinates: [...]
     }

   All coordinates are expected to use:
     [longitude, latitude]

   Coordinate-system details and field-survey metadata
   belong in properties until the dedicated VN2000
   layer is implemented.

========================================================== */

function normalizeGISObject(
  data
) {

  const now =
    new Date().toISOString();


  return {

    objectId:
      data.objectId ||
      crypto.randomUUID(),


    projectId:
      data.projectId,


    layerType:
      data.layerType,


    geometry:
      data.geometry || null,


    properties:
      data.properties || {},


    status:
      data.status ||
      "ACTIVE",


    createdAt:
      data.createdAt ||
      now,


    updatedAt:
      data.updatedAt ||
      now

  };

}


/* ==========================================================
   GIS OBJECT — CREATE
========================================================== */

async function createGISObject(
  data
) {

  await initDatabase();


  if (
    !data ||
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


  if (
    !data.geometry
  ) {

    throw new Error(
      "GIS object requires geometry."
    );

  }


  const project =
    await getProject(
      data.projectId
    );


  if (!project) {

    throw new Error(
      "Cannot create GIS object: project not found."
    );

  }


  const gisObject =
    normalizeGISObject(
      data
    );


  return new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readwrite"
        );


      const store =
        tx.objectStore(
          STORES.GIS_OBJECTS
        );


      store.add(
        gisObject
      );


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


/* ==========================================================
   GIS OBJECT — UPDATE
========================================================== */

async function updateGISObject(
  gisObject
) {

  await initDatabase();


  if (
    !gisObject ||
    !gisObject.objectId
  ) {

    throw new Error(
      "GIS object requires objectId."
    );

  }


  const updatedObject = {

    ...gisObject,

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


      const store =
        tx.objectStore(
          STORES.GIS_OBJECTS
        );


      store.put(
        updatedObject
      );


      tx.oncomplete = () => {

        resolve(
          updatedObject
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


/* ==========================================================
   GIS OBJECT — GET BY ID
========================================================== */

async function getGISObject(
  objectId
) {

  await initDatabase();


  return new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          STORES.GIS_OBJECTS,
          "readonly"
        );


      const store =
        tx.objectStore(
          STORES.GIS_OBJECTS
        );


      const request =
        store.get(
          objectId
        );


      request.onsuccess = () => {

        resolve(
          request.result || null
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


/* ==========================================================
   GIS OBJECT — GET BY PROJECT
========================================================== */

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


      const store =
        tx.objectStore(
          STORES.GIS_OBJECTS
        );


      const index =
        store.index(
          "projectId"
        );


      const request =
        index.getAll(
          projectId
        );


      request.onsuccess = () => {

        const list =
          Array.isArray(
            request.result
          )
            ? request.result
            : [];


        list.sort(
          (a, b) => {

            return new Date(
              a.createdAt || 0
            ) -
            new Date(
              b.createdAt || 0
            );

          }
        );


        resolve(
          list
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


/* ==========================================================
   GIS OBJECT — GET BY LAYER
========================================================== */

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


      const store =
        tx.objectStore(
          STORES.GIS_OBJECTS
        );


      const index =
        store.index(
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
          Array.isArray(
            request.result
          )
            ? request.result
            : []
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


/* ==========================================================
   GIS OBJECT — DELETE
========================================================== */

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


      const store =
        tx.objectStore(
          STORES.GIS_OBJECTS
        );


      store.delete(
        objectId
      );


      tx.oncomplete = () => {

        resolve(
          true
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


/* ==========================================================
   GIS OBJECT — DELETE ALL BY PROJECT
==========================================================

   Administrative function only.

   It is intentionally NOT called automatically by the app.

   This protects real survey data from accidental deletion
   during normal project opening/loading.

========================================================== */

async function deleteGISObjectsByProject(
  projectId
) {

  await initDatabase();


  const objects =
    await getGISObjectsByProject(
      projectId
    );


  if (
    objects.length === 0
  ) {

    return 0;

  }


  return new Promise(
    (resolve, reject) => {

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
        object => {

          store.delete(
            object.objectId
          );

        }
      );


      tx.oncomplete = () => {

        resolve(
          objects.length
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


/* ==========================================================
   GIS LAYER TYPES
========================================================== */

function getGISLayerTypes() {

  return {
    ...GIS_LAYER_TYPES
  };

}


/* ==========================================================
   DATABASE STATUS
========================================================== */

function getDatabaseInfo() {

  return {

    name:
      DB_NAME,

    version:
      DB_VERSION,

    stores: {

      projects:
        STORES.PROJECTS,

      gisObjects:
        STORES.GIS_OBJECTS

    },

    gisLayerTypes:
      {
        ...GIS_LAYER_TYPES
      }

  };

}


/* ==========================================================
   PUBLIC API
========================================================== */

window.DB = {

  /* Database */

  initDatabase,

  getDatabaseInfo,


  /* Project */

  createProject,

  updateProject,

  getAllProjects,

  getLatestProject,

  getProject,


  /* GIS */

  createGISObject,

  updateGISObject,

  getGISObject,

  getGISObjectsByProject,

  getGISObjectsByLayer,

  deleteGISObject,

  deleteGISObjectsByProject,

  getGISLayerTypes

};


/* ==========================================================
   DEBUG
========================================================== */

console.log(
  "TGS DB REV03 loaded:",
  {
    database:
      DB_NAME,

    version:
      DB_VERSION,

    stores:
      STORES,

    gis:
      GIS_LAYER_TYPES,

    syntheticData:
      false
  }
);
