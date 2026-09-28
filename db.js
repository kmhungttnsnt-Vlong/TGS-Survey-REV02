/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B3 — DB.JS (DATA CONTRACT - FULL PRODUCTION VERSION)
   DOCUMENT ID: TGS-HO-301 REV01 COMPLIANT
   DATABASE: TGS_SURVEY_DB (VERSION 4)
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

    /* =====================================================
       HÀM SINH ID AN TOÀN TUYỆT ĐỐI (KHÔNG BAO GIỜ RỖNG)
    ===================================================== */
    function generateUUID() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            try {
                return crypto.randomUUID();
            } catch (e) {
                // Fallback nếu có lỗi ngầm trên môi trường di động cũ
            }
        }
        return "tgs_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);
    }

    /* =====================================================
       KHỞI TẠO CƠ SỞ DỮ LIỆU INDEXEDDB V4 (5 OBJECT STORES)
    ===================================================== */
    async function init() {
        if (database) return database;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = e => {
                const db = e.target.result;

                // 1. Store: projects
                if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
                    const s = db.createObjectStore(STORES.PROJECTS, { keyPath: "id" });
                    s.createIndex("status", "status", { unique: false });
                    s.createIndex("updatedAt", "updatedAt", { unique: false });
                }

                // 2. Store: surveys
                if (!db.objectStoreNames.contains(STORES.SURVEYS)) {
                    const s = db.createObjectStore(STORES.SURVEYS, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                }

                // 3. Store: gisObjects
                if (!db.objectStoreNames.contains(STORES.GIS_OBJECTS)) {
                    const s = db.createObjectStore(STORES.GIS_OBJECTS, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                    s.createIndex("layer", "layer", { unique: false });
                }

                // 4. Store: evidence
                if (!db.objectStoreNames.contains(STORES.EVIDENCE)) {
                    const s = db.createObjectStore(STORES.EVIDENCE, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                }

                // 5. Store: timeline
                if (!db.objectStoreNames.contains(STORES.TIMELINE)) {
                    const s = db.createObjectStore(STORES.TIMELINE, { keyPath: "id" });
                    s.createIndex("projectId", "projectId", { unique: false });
                }
            };

            request.onsuccess = () => {
                database = request.result;
                resolve(database);
            };

            request.onerror = () => {
                console.error("[IndexedDB] Lỗi khởi tạo cơ sở dữ liệu:", request.error);
                reject(request.error);
            };
        });
    }

    /* =====================================================
       HELPER LẤY OBJECT STORE AN TOÀN
    ===================================================== */
    function getStore(storeName, mode = "readonly") {
        if (!database) {
            throw new Error("IndexedDB chưa được khởi tạo. Hãy gọi DB.init() trước.");
        }
        const tx = database.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    /* =====================================================
       1. STORE: PROJECTS APIs (PERSISTENCE GATEWAY)
    ===================================================== */
    async function createProject(data) {
        await init();

        // Đảm bảo id luôn tồn tại dưới dạng chuỗi hợp lệ
        let projectId = (data && data.id) ? String(data.id).trim() : "";
        if (!projectId) {
            projectId = generateUUID();
        }

        const project = {
            id: projectId,
            name: (data && data.name) ? String(data.name).trim() : "Chưa đặt tên",
            code: (data && data.code) ? String(data.code).trim() : "",
            location: (data && data.location) ? String(data.location).trim() : "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: "draft",
            surveyType: null,
            points: [],
            pointFeatures: [],
            meta: {
                centralMeridian: (data && data.centralMeridian) ? Number(data.centralMeridian) : 105.5
            }
        };

        return new Promise((resolve, reject) => {
            try {
                const store = getStore(STORES.PROJECTS, "readwrite");
                const req = store.put(project);

                req.onsuccess = () => resolve(project);
                req.onerror = () => {
                    console.error("[IndexedDB] Lỗi khi tạo mới dự án:", req.error);
                    reject(req.error);
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    async function saveProject(project) {
        await init();

        if (!project || typeof project !== "object") {
            throw new Error("Lỗi dữ liệu: Cấu trúc hồ sơ không hợp lệ.");
        }

        // Bắt buộc có khóa chính hợp lệ theo keyPath: "id"
        if (!project.id || typeof project.id !== "string") {
            project.id = generateUUID();
        }

        project.updatedAt = Date.now();

        return new Promise((resolve, reject) => {
            try {
                const store = getStore(STORES.PROJECTS, "readwrite");
                const req = store.put(project);

                req.onsuccess = () => resolve(project);
                req.onerror = () => {
                    console.error("[IndexedDB] Lỗi khi cập nhật dự án:", req.error);
                    reject(req.error);
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    async function getDraftProject() {
        await init();
        const list = await getAllProjects();
        return list.find(p => p.status === "draft") || null;
    }

    async function getProjectById(id) {
        await init();
        return new Promise((resolve, reject) => {
            try {
                const store = getStore(STORES.PROJECTS, "readonly");
                const req = store.get(id);

                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    async function getAllProjects() {
        await init();
        return new Promise((resolve, reject) => {
            try {
                const store = getStore(STORES.PROJECTS, "readonly");
                const req = store.getAll();

                req.onsuccess = () => {
                    const arr = (req.result || []).sort((a, b) => b.updatedAt - a.updatedAt);
                    resolve(arr);
                };
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    async function deleteProject(id) {
        await init();
        return new Promise((resolve, reject) => {
            try {
                const store = getStore(STORES.PROJECTS, "readwrite");
                const req = store.delete(id);

                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    /* =====================================================
       2. STORE: EVIDENCE & TIMELINE APIs
    ===================================================== */
    async function saveEvidence(item) {
        await init();
        if (!item.id) item.id = generateUUID();
        item.timestamp = item.timestamp || Date.now();

        return new Promise((resolve, reject) => {
            try {
                const store = getStore(STORES.EVIDENCE, "readwrite");
                const req = store.put(item);
                req.onsuccess = () => resolve(item);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    async function saveTimeline(entry) {
        await init();
        if (!entry.id) entry.id = generateUUID();
        entry.timestamp = entry.timestamp || Date.now();

        return new Promise((resolve, reject) => {
            try {
                const store = getStore(STORES.TIMELINE, "readwrite");
                const req = store.put(entry);
                req.onsuccess = () => resolve(entry);
                req.onerror = () => reject(req.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    /* =====================================================
       CLEAR DATABASE (RESET MÔI TRƯỜNG DỮ LIỆU)
    ===================================================== */
    async function clearAll() {
        await init();
        return new Promise((resolve, reject) => {
            try {
                const tx = database.transaction(
                    [STORES.PROJECTS, STORES.SURVEYS, STORES.GIS_OBJECTS, STORES.EVIDENCE, STORES.TIMELINE],
                    "readwrite"
                );
                tx.objectStore(STORES.PROJECTS).clear();
                tx.objectStore(STORES.SURVEYS).clear();
                tx.objectStore(STORES.GIS_OBJECTS).clear();
                tx.objectStore(STORES.EVIDENCE).clear();
                tx.objectStore(STORES.TIMELINE).clear();

                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            } catch (err) {
                reject(err);
            }
        });
    }

    /* =====================================================
       PUBLIC EXPORTS (DATA CONTRACT STRICT)
    ===================================================== */
    return {
        init,
        createProject,
        saveProject,
        getDraftProject,
        getProjectById,
        getAllProjects,
        deleteProject,
        saveEvidence,
        saveTimeline,
        clearAll
    };
})();
