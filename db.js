/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B3 — DB.JS
   DATA CONTRACT (5 OBJECT STORES — VERSION 4)
========================================================= */

const DB = (() => {
    const DB_NAME = "TGS_SURVEY_DB";
    const DB_VERSION = 4;

    const STORES = {
        PROJECTS: "projects",
        SURVEYS: "surveys",
        GIS_OBJECTS: "gisObjects",
        EVIDENCE: "evidence",
        TIMELINE: "timeline"
    };

    let database = null;

    function generateUUID() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = e => {
                const db = e.target.result;

                // 1. Projects Store
                if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
                    const s = db.createObjectStore(STORES.PROJECTS, { keyPath: "id" });
                    s.createIndex("status", "status", { unique: false });
                    s.createIndex("updatedAt", "updatedAt", { unique: false });
                }

                // 2. Surveys Store
                if (!db.objectStoreNames.contains(STORES.SURVEYS)) {
                    const s = db.createObjectStore(STORES.SURVEYS, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                }

                // 3. GIS Objects Store (Pipes, Valves, Stations)
                if (!db.objectStoreNames.contains(STORES.GIS_OBJECTS)) {
                    const s = db.createObjectStore(STORES.GIS_OBJECTS, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                    s.createIndex("layer", "layer", { unique: false });
                }

                // 4. Evidence Store (Photos / Videos Metadata)
                if (!db.objectStoreNames.contains(STORES.EVIDENCE)) {
                    const s = db.createObjectStore(STORES.EVIDENCE, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                }

                // 5. Timeline Store (Audit Trail)
                if (!db.objectStoreNames.contains(STORES.TIMELINE)) {
                    const s = db.createObjectStore(STORES.TIMELINE, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                }
            };

            request.onsuccess = () => {
                database = request.result;
                resolve(true);
            };

            request.onerror = () => reject(request.error);
        });
    }

    function getStore(storeName, mode = "readonly") {
        if (!database) {
            throw new Error("IndexedDB chưa khởi tạo.");
        }
        const tx = database.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    /* PROJECT API */
    async function createProject(data) {
        const project = {
            id: generateUUID(),
            name: data.name || "Chưa đặt tên",
            code: data.code || "",
            location: data.location || "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: "draft",
            surveyType: null,
            points: [],         // Tim tuyến khảo sát
            pointFeatures: [],  // Trạm, hố van, thiết bị
            meta: {
                centralMeridian: data.centralMeridian || 105.5
            }
        };
        return saveProject(project);
    }

    async function saveProject(project) {
        project.updatedAt = Date.now();
        return new Promise((resolve, reject) => {
            const req = getStore(STORES.PROJECTS, "readwrite").put(project);
            req.onsuccess = () => resolve(project);
            req.onerror = () => reject(req.error);
        });
    }

    async function getDraftProject() {
        const list = await getAllProjects();
        return list.find(p => p.status === "draft") || null;
    }

    async function getProjectById(id) {
        return new Promise((resolve, reject) => {
            const req = getStore(STORES.PROJECTS, "readonly").get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    async function getAllProjects() {
        return new Promise((resolve, reject) => {
            const req = getStore(STORES.PROJECTS, "readonly").getAll();
            req.onsuccess = () => {
                const arr = (req.result || []).sort((a, b) => b.updatedAt - a.updatedAt);
                resolve(arr);
            };
            req.onerror = () => reject(req.error);
        });
    }

    return {
        init,
        createProject,
        saveProject,
        getDraftProject,
        getProjectById,
        getAllProjects
    };
})();
