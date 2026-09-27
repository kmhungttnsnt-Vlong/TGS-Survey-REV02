/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B3 — DB.JS
   DATA LAYER ONLY
   REV02 (FIXED)
========================================================= */

const DB = (() => {
    const DB_NAME = "TGS_SURVEY_DB";
    const DB_VERSION = 3;
    const STORE = "projects";

    let database = null;

    // Fallback sinh UUID an toàn khi chạy offline qua file:///
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

    /* ===========================
       INIT DATABASE
    =========================== */
    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, { keyPath: "id" });
                    store.createIndex("status", "status", { unique: false });
                    store.createIndex("updatedAt", "updatedAt", { unique: false });
                }
            };

            request.onsuccess = () => {
                database = request.result;
                resolve(true);
            };

            request.onerror = () => reject(request.error);
        });
    }

    function getStore(mode = "readonly") {
        if (!database) {
            throw new Error("IndexedDB chưa được khởi tạo. Hãy gọi DB.init() trước.");
        }
        const tx = database.transaction(STORE, mode);
        return tx.objectStore(STORE);
    }

    /* ===========================
       CREATE PROJECT
    =========================== */
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
            points: [],
            lines: [],
            meta: {}
        };
        return save(project);
    }

    /* ===========================
       SAVE / UPDATE
    =========================== */
    async function save(project) {
        project.updatedAt = Date.now();
        return new Promise((resolve, reject) => {
            const req = getStore("readwrite").put(project);
            req.onsuccess = () => resolve(project);
            req.onerror = () => reject(req.error);
        });
    }

    /* ===========================
       GET DRAFT
    =========================== */
    async function getDraft() {
        const list = await getAll();
        return list.find(p => p.status === "draft") || null;
    }

    /* ===========================
       GET BY ID
    =========================== */
    async function getById(id) {
        return new Promise((resolve, reject) => {
            const req = getStore("readonly").get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    /* ===========================
       GET ALL
    =========================== */
    async function getAll() {
        return new Promise((resolve, reject) => {
            const req = getStore("readonly").getAll();
            req.onsuccess = () => {
                const arr = (req.result || []).sort(
                    (a, b) => b.updatedAt - a.updatedAt
                );
                resolve(arr);
            };
            req.onerror = () => reject(req.error);
        });
    }

    /* ===========================
       COMPLETE PROJECT
    =========================== */
    async function complete(id) {
        const p = await getById(id);
        if (!p) return null;
        p.status = "completed";
        return save(p);
    }

    /* ===========================
       DELETE
    =========================== */
    async function remove(id) {
        return new Promise((resolve, reject) => {
            const req = getStore("readwrite").delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    /* ===========================
       CLEAR
    =========================== */
    async function clear() {
        return new Promise((resolve, reject) => {
            const req = getStore("readwrite").clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    return {
        init,
        createProject,
        save,
        getDraft,
        getById,
        getAll,
        complete,
        remove,
        clear
    };
})();
