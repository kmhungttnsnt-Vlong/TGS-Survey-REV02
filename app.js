/* =========================================================
   TGS PLATFORM GENESIS 2.0 - PROFESSIONAL FIELD ENGINE
   BASELINE B8: LONG-RECORDING, MULTI-USER & HYBRID CLOUD
========================================================= */

const TGS = (() => {

    // CẤU HÌNH MẶC ĐỊNH & BẢO MẬT
    const CONFIG = {
        DEFAULT_SERVER_URL: "https://code-any-bicycle-salaries.trycloudflare.com",
        TGS_API_KEY: "TGS_SECURE_TOKEN_2026_VINHLONG",
        // Danh sách PIN kích hoạt thiết bị (Dành riêng cho anh em đội khảo sát)
        ALLOWED_PINS: {
            "8901": { name: "Kim Minh Hùng", role: "Trưởng nhóm" },
            "8902": { name: "Trương Thành Cọt", role: "Khảo sát viên" },
            "8903": { name: "Nguyễn Phát Tấn", role: "Khảo sát viên" },
            "8900": { name: "Khảo Sát Hiện Trường", role: "Kỹ thuật viên" }
        }
    };

    const EventBus = {
        events: {},
        on(event, fn) { (this.events[event] = this.events[event] || []).push(fn); },
        emit(event, data) { (this.events[event] || []).forEach(fn => fn(data)); }
    };

    // Module Tọa độ VN-2000
    const VN2000Service = {
        forward(lat, lon, L0 = 105.5) {
            const a = 6378137.0, f = 1 / 298.257223563;
            const b = a * (1 - f);
            const e2 = (a * a - b * b) / (a * a);
            const ePrime2 = (a * a - b * b) / (b * b);
            const k0 = 0.9999, falseEasting = 500000.0;

            const phi = (lat * Math.PI) / 180;
            const lambda = (lon * Math.PI) / 180;
            const lambda0 = (L0 * Math.PI) / 180;
            const deltaLambda = lambda - lambda0;

            const N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi));
            const T = Math.tan(phi) * Math.tan(phi);
            const C = ePrime2 * Math.cos(phi) * Math.cos(phi);
            const A = deltaLambda * Math.cos(phi);

            const M = a * (
                (1 - e2 / 4 - 3 * Math.pow(e2, 2) / 64 - 5 * Math.pow(e2, 3) / 256) * phi
                - (3 * e2 / 8 + 3 * Math.pow(e2, 2) / 32 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(2 * phi)
                + (15 * Math.pow(e2, 2) / 256 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(4 * phi)
                - (35 * Math.pow(e2, 3) / 3072) * Math.sin(6 * phi)
            );

            const y = falseEasting + k0 * N * (
                A + (1 - T + C) * Math.pow(A, 3) / 6
                + (5 - 18 * T + Math.pow(T, 2) + 72 * C - 58 * ePrime2) * Math.pow(A, 5) / 120
            );

            const x = k0 * (
                M + N * Math.tan(phi) * (
                    Math.pow(A, 2) / 2
                    + (5 - T + 9 * C + 4 * Math.pow(C, 2)) * Math.pow(A, 4) / 24
                    + (61 - 58 * T + Math.pow(T, 2) + 600 * C - 330 * ePrime2) * Math.pow(A, 6) / 720
                )
            );

            return {
                x: Number(x.toFixed(3)),
                y: Number(y.toFixed(3)),
                text: `X:${x.toFixed(2)} | Y:${y.toFixed(2)}`
            };
        }
    };

    /* =====================================================
       1. QUẢN LÝ PHÂN QUYỀN PIN & CẤU HÌNH LƯU TRỮ
    ===================================================== */
    const A0_AuthManager = {
        currentUser: null,

        checkAuth() {
            const savedPin = localStorage.getItem("TGS_AUTH_PIN");
            if (savedPin && CONFIG.ALLOWED_PINS[savedPin]) {
                this.currentUser = CONFIG.ALLOWED_PINS[savedPin];
                return true;
            }
            return false;
        },

        verifyPin(pin) {
            if (CONFIG.ALLOWED_PINS[pin]) {
                localStorage.setItem("TGS_AUTH_PIN", pin);
                this.currentUser = CONFIG.ALLOWED_PINS[pin];
                return true;
            }
            return false;
        },

        getStorageTarget() {
            return localStorage.getItem("TGS_STORAGE_MODE") || "server"; // 'server' | 'drive'
        },

        getWebhookUrl() {
            if (this.getStorageTarget() === "drive") {
                return localStorage.getItem("TGS_USER_DRIVE_WEBHOOK") || "";
            }
            return localStorage.getItem("TGS_SERVER_TUNNEL_URL") || CONFIG.DEFAULT_SERVER_URL;
        }
    };

    /* =====================================================
       2. QUẢN LÝ HỒ SƠ & TỰ ĐỘNG TĂNG MÃ (TGS-005...)
    ===================================================== */
    const A1_State = {
        currentProject: null,
        currentScreen: "screenSplash",
        cachedProjects: []
    };

    const A4_Persistence = {
        async init() {
            if (typeof DB !== "undefined") {
                await DB.init();
                return true;
            }
            throw new Error("Không tìm thấy DB.js");
        },
        async getDraftProject() { return DB.getDraftProject(); },
        async createProject(data) { return DB.createProject(data); },
        async saveProject(project) { return DB.saveProject(project); },
        async getAllProjects() { return DB.getAllProjects(); }
    };

    const A3_ProjectLifecycle = {
        async generateNextProjectCode() {
            try {
                const projects = await A4_Persistence.getAllProjects();
                let maxNum = 0;
                const regex = /TGS-(\d+)/i;

                projects.forEach(p => {
