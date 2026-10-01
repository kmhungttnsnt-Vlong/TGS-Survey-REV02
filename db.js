/* =========================================================
   TGS PLATFORM GENESIS 2.0
   DB.JS - INDEXEDDB STORAGE (BLOB & BINARY COMPATIBLE)
========================================================= */

const DB = (() => {
    const DB_NAME = "TGS_SURVEY_DB";
    const DB_VERSION = 5;
    const STORE_PROJECTS = "projects";
    let dbInstance = null;

    function openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
                    const store = db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
                    store.createIndex("code", "code", { unique: false });
                    store.createIndex("status", "status", { unique: false });
                    store.createIndex("updatedAt", "updatedAt", { unique: false });
                }
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onerror = (event) => {
                reject(new Error("Lỗi mở IndexedDB: " + event.target.error));
            };
        });
    }

    return {
        async init() {
            if (!dbInstance) {
                await openDatabase();
            }
            return dbInstance;
        },

        async saveProject(project) {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROJECTS, "readwrite");
                const store = tx.objectStore(STORE_PROJECTS);
                const req = store.put(project);

                req.onsuccess = () => resolve(project);
                req.onerror = () => reject(req.error);
            });
        },

        async getProjectById(id) {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROJECTS, "readonly");
                const store = tx.objectStore(STORE_PROJECTS);
                const req = store.get(id);

                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
        },

        async getAllProjects() {
            const db = await this.init();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROJECTS, "readonly");
                const store = tx.objectStore(STORE_PROJECTS);
                const req = store.getAll();

                req.onsuccess = () => {
                    const list = req.result || [];
                    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    resolve(list);
                };
                req.onerror = () => reject(req.error);
            });
        },

        async getDraftProject() {
            const list = await this.getAllProjects();
            return list.find(p => p.status === "draft") || null;
        },

        async createProject(meta) {
            const newProj = {
                id: "PROJ_" + Date.now(),
                name: meta.name,
                code: meta.code,
                location: meta.location,
                status: "draft",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                meta: { centralMeridian: meta.centralMeridian || 105.5 },
                points: [],
                pointFeatures: []
            };
            return this.saveProject(newProj);
        }
    };
})();
