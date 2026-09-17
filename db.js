/* ==========================================================
   TGS PLATFORM — SURVEY REV02
   IndexedDB Offline Database
   Version : REV02
========================================================== */

const DB_NAME = "TGS_SURVEY_DB";
const DB_VERSION = 1;
const STORE = "surveys";

let db = null;

/* ---------- Khởi tạo Database ---------- */
function initDB() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {

            db = event.target.result;

            if (!db.objectStoreNames.contains(STORE)) {

                const store = db.createObjectStore(STORE, {
                    keyPath: "id"
                });

                store.createIndex("status", "status");
                store.createIndex("createdAt", "createdAt");

            }

        };

        request.onsuccess = () => {

            db = request.result;
            resolve();

        };

        request.onerror = () => reject(request.error);

    });

}

/* ---------- Lưu khảo sát ---------- */
async function saveSurvey(data) {

    await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE, "readwrite");

        tx.objectStore(STORE).put(data);

        tx.oncomplete = () => resolve(true);

        tx.onerror = () => reject(tx.error);

    });

}

/* ---------- Lấy 1 khảo sát ---------- */
async function getSurvey(id) {

    await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE, "readonly");

        const req = tx.objectStore(STORE).get(id);

        req.onsuccess = () => resolve(req.result);

        req.onerror = () => reject(req.error);

    });

}

/* ---------- Danh sách khảo sát ---------- */
async function getAllSurveys() {

    await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE, "readonly");

        const req = tx.objectStore(STORE).getAll();

        req.onsuccess = () => {

            const list = req.result.sort(
                (a, b) => b.createdAt - a.createdAt
            );

            resolve(list);

        };

        req.onerror = () => reject(req.error);

    });

}

/* ---------- Khảo sát đang tạm dừng ---------- */
async function getPausedSurvey() {

    const list = await getAllSurveys();

    return list.find(item => item.status === "PAUSED");

}

/* ---------- Xóa ---------- */
async function deleteSurvey(id) {

    await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE, "readwrite");

        tx.objectStore(STORE).delete(id);

        tx.oncomplete = () => resolve();

        tx.onerror = () => reject(tx.error);

    });

}

/* ---------- Tạo ID ---------- */
function generateSurveyID() {

    const now = new Date();

    const y = now.getFullYear();

    const m = String(now.getMonth() + 1).padStart(2, "0");

    const d = String(now.getDate()).padStart(2, "0");

    const h = String(now.getHours()).padStart(2, "0");

    const mm = String(now.getMinutes()).padStart(2, "0");

    const s = String(now.getSeconds()).padStart(2, "0");

    return `KS-${y}${m}${d}-${h}${mm}${s}`;

}

/* ---------- Thời gian ---------- */
function nowISO() {

    return new Date().toISOString();

}

/* ---------- Mẫu khảo sát ---------- */
function createEmptySurvey() {

    return {

        id: generateSurveyID(),

        createdAt: Date.now(),

        updatedAt: Date.now(),

        status: "NEW",

        projectName: "",

        gps: null,

        items: [],

        photos: [],

        videoSegments: [],

        notes: [],

        sync: false

    };

}
