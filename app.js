/* =========================================================================
   TGS PLATFORM GENESIS 2.0 - PROFESSIONAL FIELD ENGINE
   BASELINE B11: COMPREHENSIVE 4-PILLAR UPGRADE ENGINE
   ========================================================================= */

/* =========================================================================
   TRỤ CỘT 1: XÁC THỰC GMAIL NỘI BỘ & PHÊ DUYỆT WHITELIST (TGS_Auth)
   ========================================================================= */
const TGS_Auth = {
    ADMIN_EMAIL: "kmhungttnsnt@vinhlong.gov.vn",

    init: function() {
        this.setupAuthUI();
        let activeUsers = JSON.parse(localStorage.getItem("tgs_active_users_list") || "[]");
        const hasAdmin = activeUsers.find(u => u.role === "admin");
        if (!hasAdmin) {
            activeUsers.push({
                name: "Kim Minh Hùng",
                email: this.ADMIN_EMAIL,
                dept: "Phòng Quản lý Khai thác",
                pass: "123456",
                role: "admin",
                status: "active"
            });
            localStorage.setItem("tgs_active_users_list", JSON.stringify(activeUsers));
        }
    },

    setupAuthUI: function() {
        const tabLogin = document.getElementById("tabBtnLogin");
        const tabReg = document.getElementById("tabBtnRegister");
        const formLogin = document.getElementById("formLogin");
        const formReg = document.getElementById("formRegister");
        const notice = document.getElementById("authNotice");

        if (tabLogin && tabReg) {
            tabLogin.onclick = () => {
                tabLogin.style.background = "#0284c7";
                tabLogin.style.color = "#fff";
                tabReg.style.background = "transparent";
                tabReg.style.color = "#64748b";
                if (formLogin) formLogin.style.display = "block";
                if (formReg) formReg.style.display = "none";
                if (notice) notice.innerText = "";
            };

            tabReg.onclick = () => {
                tabReg.style.background = "#0284c7";
                tabReg.style.color = "#fff";
                tabLogin.style.background = "transparent";
                tabLogin.style.color = "#64748b";
                if (formLogin) formLogin.style.display = "none";
                if (formReg) formReg.style.display = "block";
                if (notice) notice.innerText = "";
            };
        }
    },

    handleLogin: function() {
        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const pass = document.getElementById("loginPass").value.trim();
        const notice = document.getElementById("authNotice");

        const activeUsers = JSON.parse(localStorage.getItem("tgs_active_users_list") || "[]");
        const pendingUsers = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");

        const isPending = pendingUsers.find(u => u.email.toLowerCase() === email);
        if (isPending) {
            notice.style.color = "#eab308";
            notice.innerText = "⏳ Tài khoản đang chờ Quản trị viên (Kim Minh Hùng) phê duyệt Whitelist!";
            return;
        }

        const user = activeUsers.find(u => u.email.toLowerCase() === email && u.pass === pass);
        if (user) {
            localStorage.setItem("tgs_active_user", JSON.stringify(user));
            notice.style.color = "#16a34a";
            notice.innerText = `✓ Xin chào ${user.name}! Đang mở hệ thống...`;
            setTimeout(() => {
                const screenAuth = document.getElementById("screenAuth");
                if (screenAuth) screenAuth.style.display = "none";
                const bNav = document.getElementById("bottomNavBar");
                if (bNav) bNav.style.display = "flex";
                TGS.Navigation.show("tab-dashboard");
                TGS_System.init();
            }, 500);
        } else {
            notice.style.color = "#e11d48";
            notice.innerText = "✕ Gmail hoặc mật khẩu không chính xác!";
        }
    },

    handleRegister: function() {
        const name = document.getElementById("regFullName").value.trim();
        const email = document.getElementById("regEmail").value.trim().toLowerCase();
        const dept = document.getElementById("regDept").value.trim();
        const pass = document.getElementById("regPass").value.trim();
        const notice = document.getElementById("authNotice");

        let activeUsers = JSON.parse(localStorage.getItem("tgs_active_users_list") || "[]");
        let pendingList = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");

        if (activeUsers.some(u => u.email === email) || pendingList.some(u => u.email === email)) {
            notice.style.color = "#e11d48";
            notice.innerText = "✕ Gmail này đã được đăng ký trên hệ thống!";
            return;
        }

        pendingList.push({ name, email, dept, pass, role: "engineer", status: "pending", requestedAt: Date.now() });
        localStorage.setItem("tgs_whitelist_pending", JSON.stringify(pendingList));

        notice.style.color = "#16a34a";
        notice.innerText = "✓ Đăng ký thành công! Vui lòng liên hệ Admin (Kim Minh Hùng) để kích hoạt.";
        document.getElementById("formRegister").reset();
    },

    getCurrentUser: function() {
        return JSON.parse(localStorage.getItem("tgs_active_user") || "null");
    },

    logout: function() {
        if (confirm("Bạn có chắc chắn muốn đăng xuất tài khoản?")) {
            localStorage.removeItem("tgs_active_user");
            window.location.reload();
        }
    }
};

/* =========================================================================
   HỆ THỐNG ĐIỀU HÀNH TỔNG THỂ TGS PLATFORM (TGS)
   ========================================================================= */
const TGS = (() => {

    const CONFIG = {
        DEFAULT_SERVER_URL: "http://192.168.1.15:8000",
        TGS_API_KEY: "TGS_SECURE_TOKEN_2026_VINHLONG"
    };

    // Chuyển đổi tọa độ sang VN-2000 (Kinh tuyến trục 105.5° Vĩnh Long)
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

    /* --- Quản lý Trạng thái --- */
    const State = {
        currentProject: null,
        activeScreenId: "tab-dashboard",
        breadcrumbWatchId: null,
        lastBreadcrumbPos: null
    };

    /* --- Quản lý Bộ nhớ Database Offline --- */
    const Persistence = {
        async init() {
            if (typeof DB !== "undefined") {
                await DB.init();
                return true;
            }
            throw new Error("Chưa nạp db.js");
        },
        async getAllProjects() { return DB.getAllProjects(); },
        async createProject(data) { return DB.createProject(data); },
        async saveProject(proj) { return DB.saveProject(proj); }
    };

    /* =========================================================================
       TRỤ CỘT 2: ĐIỀU HƯỚNG GIAO DIỆN 4 MÀN HÌNH (A2_Navigation)
       ========================================================================= */
    const Navigation = {
        screens: [
            "screenAuth", "tab-dashboard", "screenProject", 
            "screenSurveyHome", "screenLinear", "screenPoint", 
            "tab-data", "tab-system"
        ],

        show(screenId) {
            this.screens.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove("active");
                    el.style.display = "none";
                }
            });

            const target = document.getElementById(screenId);
            if (target) {
                target.classList.add("active");
                target.style.display = "block";
                State.activeScreenId = screenId;
            }

            // Đồng bộ trạng thái active của Bottom Navigation Bar
            document.querySelectorAll(".nav-item").forEach(item => {
                if (item.getAttribute("data-tab") === screenId) {
                    item.classList.add("active");
                } else {
                    item.classList.remove("active");
                }
            });

            // Kích hoạt logic khi chuyển màn hình
            if (screenId === "tab-dashboard") Lifecycle.updateDashboard();
            if (screenId === "tab-data") DataHub.renderDataScreen();
            if (screenId === "tab-system") TGS_System.init();
            if (screenId === "screenLinear") LinearModule.startTracking();
            else LinearModule.stopTracking();
        }
    };

    /* =========================================================================
       VÒNG ĐỜI DỰ ÁN & DASHBOARD (Lifecycle)
       ========================================================================= */
    const Lifecycle = {
        async generateNextCode() {
            try {
                const all = await Persistence.getAllProjects();
                let maxNum = 0;
                all.forEach(p => {
                    const match = p.code?.match(/TGS-(\d+)/i);
                    if (match) {
                        const n = parseInt(match[1], 10);
                        if (n > maxNum) maxNum = n;
                    }
                });
                return `TGS-${(maxNum + 1).toString().padStart(3, "0")}`;
            } catch (e) {
                return "TGS-001";
            }
        },

        async updateDashboard() {
            const user = TGS_Auth.getCurrentUser();
            if (user) {
                const uName = document.getElementById("dashUserName");
                const uDept = document.getElementById("dashUserDept");
                if (uName) uName.innerText = user.name;
                if (uDept) uDept.innerText = user.dept;
            }

            try {
                const all = await Persistence.getAllProjects();
                const totalEl = document.getElementById("dashTotalProjects");
                if (totalEl) totalEl.innerText = `${all.length} hồ sơ`;

                const draft = all.find(p => p.status === "draft" || !p.status);
                const draftBanner = document.getElementById("draftBanner");
                const draftInfo = document.getElementById("draftProjectInfo");

                if (draft) {
                    State.currentProject = draft;
                    if (draftInfo) {
                        const pts = draft.points ? draft.points.length : 0;
                        const fts = draft.pointFeatures ? draft.pointFeatures.length : 0;
                        draftInfo.innerHTML = `Đang làm: <b>${draft.name}</b> (${draft.code})<br><small style="color:#64748b;">${pts} điểm tuyến · ${fts} cấu kiện trạm</small>`;
                    }
                    if (draftBanner) draftBanner.classList.remove("hidden");
                } else {
                    if (draftBanner) draftBanner.classList.add("hidden");
                }
            } catch (e) {
                console.warn(e);
            }
        },

        async createNewProject() {
            const name = document.getElementById("projectName").value.trim();
            const code = document.getElementById("projectCode").value.trim();
            const location = document.getElementById("projectLocation").value.trim();
            const user = TGS_Auth.getCurrentUser();

            if (!name || !code) {
                alert("Vui lòng nhập tên và mã công trình.");
                return;
            }

            const newProj = {
                name,
                code,
                location,
                centralMeridian: 105.5,
                status: "draft",
                points: [],
                pointFeatures: [],
                linearMedia: [],
                leftPipeSpecs: [],
                rightPipeSpecs: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                author: user ? `${user.name} (${user.email})` : "Kỹ sư khảo sát"
            };

            await Persistence.createProject(newProj);
            State.currentProject = newProj;
            this.enterSurveyHome();
        },

        enterSurveyHome() {
            if (!State.currentProject) return;
            const titleEl = document.getElementById("surveyProjectTitle");
            const subEl = document.getElementById("surveyProjectSubtitle");
            if (titleEl) titleEl.innerText = State.currentProject.name;
            if (subEl) subEl.innerText = `Mã: ${State.currentProject.code} · ${State.currentProject.location || "Vĩnh Long"}`;

            const pts = State.currentProject.points || [];
            const fts = State.currentProject.pointFeatures || [];
            const badgeLinear = document.getElementById("badgeLinearSummary");
            const badgePoint = document.getElementById("badgePointSummary");

            if (badgeLinear) badgeLinear.innerText = `${pts.length} điểm`;
            if (badgePoint) badgePoint.innerText = `${fts.length} cấu kiện`;

            Navigation.show("screenSurveyHome");
        }
    };

    /* =========================================================================
       BỘ LỌC SMART GNSS 20 MẪU ĐỘC LẬP (L3_SmartGNSS)
       ========================================================================= */
    const SmartGNSS = {
        sampleTarget: 20,
        isSampling: false,

        collect20Samples(onProgress, onComplete) {
            if (this.isSampling) return;
            if (!navigator.geolocation) {
                alert("Thiết bị không hỗ trợ Geolocation.");
                return;
            }

            this.isSampling = true;
            const samples = [];
            let lastLat = null, lastLng = null, lastTime = 0;

            const timer = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        const { latitude, longitude, accuracy } = pos.coords;
                        const now = Date.now();

                        if (now - lastTime < 700) return;
                        if (accuracy > 18) return;
                        if (lastLat === latitude && lastLng === longitude) return;

                        lastLat = latitude;
                        lastLng = longitude;
                        lastTime = now;
                        samples.push({ latitude, longitude, accuracy });

                        if (onProgress) onProgress(samples.length, SmartGNSS.sampleTarget);

                        if (samples.length >= SmartGNSS.sampleTarget) {
                            clearInterval(timer);
                            SmartGNSS.isSampling = false;

                            // Sắp xếp loại bỏ 15% mẫu sai số lớn nhất
                            samples.sort((a, b) => a.accuracy - b.accuracy);
                            const clean = samples.slice(0, Math.ceil(samples.length * 0.85));

                            let wSum = 0, latSum = 0, lngSum = 0;
                            clean.forEach(s => {
                                const w = 1 / Math.max(s.accuracy * s.accuracy, 1);
                                wSum += w;
                                latSum += s.latitude * w;
                                lngSum += s.longitude * w;
                            });

                            const meanLat = latSum / wSum;
                            const meanLng = lngSum / wSum;
                            const medianAcc = clean[Math.floor(clean.length / 2)].accuracy;
                            const vn2000 = VN2000Service.forward(meanLat, meanLng, 105.5);

                            onComplete({
                                latitude: meanLat,
                                longitude: meanLng,
                                accuracy: Math.round(medianAcc),
                                vn2000: vn2000
                            });
                        }
                    },
                    err => console.warn(err),
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                );
            }, 750);
        }
    };

    /* =========================================================================
       TRỤ CỘT 3A: KHẢO SÁT TUYẾN ỐNG BREADCRUMB & ỐNG TRÁI/PHẢI (LinearModule)
       ========================================================================= */
    const LinearModule = {
        map: null,
        polyline: null,
        markerLayer: null,
        totalLength: 0,

        initMap() {
            if (this.map) return;
            const container = document.getElementById("map");
            if (!container) return;

            this.map = L.map("map", { zoomControl: false, attributionControl: false }).setView([9.95, 106.34], 16);
            L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(this.map);
            this.markerLayer = L.layerGroup().addTo(this.map);
            this.polyline = L.polyline([], { color: "#00E5FF", weight: 5, opacity: 0.9 }).addTo(this.map);
        },

        startTracking() {
            this.initMap();
            setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 300);

            const nameEl = document.getElementById("linearProjectName");
            if (nameEl && State.currentProject) {
                nameEl.innerText = `${State.currentProject.name} (${State.currentProject.code})`;
            }

            if (!navigator.geolocation || State.breadcrumbWatchId) return;

            // Bật thuật toán Breadcrumb bám đường cong thực tế
            State.breadcrumbWatchId = navigator.geolocation.watchPosition(
                pos => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    if (accuracy > 20) return;

                    const curLatLng = L.latLng(latitude, longitude);
                    if (this.map) this.map.setView(curLatLng, 18);

                    if (State.lastBreadcrumbPos) {
                        const dist = curLatLng.distanceTo(State.lastBreadcrumbPos);
                        if (dist >= 3.5) { // Cứ mỗi 3.5 mét tự động nối đoạn cong
                            this.totalLength += dist;
                            State.lastBreadcrumbPos = curLatLng;
                            this.polyline.addLatLng(curLatLng);
                            this.updateLinearHUD(curLatLng, accuracy);
                        }
                    } else {
                        State.lastBreadcrumbPos = curLatLng;
                        this.polyline.addLatLng(curLatLng);
                    }
                },
                err => console.warn(err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
            );
        },

        stopTracking() {
            if (State.breadcrumbWatchId) {
                navigator.geolocation.clearWatch(State.breadcrumbWatchId);
                State.breadcrumbWatchId = null;
            }
        },

        updateLinearHUD(latLng, acc) {
            const lenEl = document.getElementById("lineLength");
            const ptEl = document.getElementById("pointCount");
            const accEl = document.getElementById("gpsAccuracy");
            const vnEl = document.getElementById("vn2000Text");

            if (lenEl) lenEl.innerText = `${Math.round(this.totalLength)} m`;
            if (ptEl && State.currentProject?.points) ptEl.innerText = State.currentProject.points.length;
            if (accEl) accEl.innerText = `± ${Math.round(acc)}m`;

            const vn = VN2000Service.forward(latLng.lat, latLng.lng, 105.5);
            if (vnEl) vnEl.innerText = `${vn.x.toFixed(0)}, ${vn.y.toFixed(0)}`;
        },

        // Chốt mốc kỹ thuật 20 mẫu vi sai (ngã rẽ, van phân phối, mốc đầu/cuối)
        captureTechnicalMilestone() {
            if (!State.currentProject) return;
            const btnText = document.getElementById("captureBtnText");

            SmartGNSS.collect20Samples(
                (cur, target) => { if (btnText) btnText.innerText = `⏳ Đang gom mốc (${cur}/${target})...`; },
                async (evaluated) => {
                    if (btnText) btnText.innerText = "◎ CHỐT MỐC KỸ THUẬT (20 MẪU)";

                    const leftPipe = document.getElementById("lineLeftDiameter").value;
                    const rightPipe = document.getElementById("lineRightDiameter").value;

                    const milestone = {
                        id: Date.now().toString(),
                        lat: evaluated.latitude,
                        lng: evaluated.longitude,
                        accuracy: evaluated.accuracy,
                        vn2000: evaluated.vn2000,
                        meterMark: Math.round(LinearModule.totalLength),
                        leftPipe: leftPipe,
                        rightPipe: rightPipe,
                        timestamp: Date.now()
                    };

                    if (!State.currentProject.points) State.currentProject.points = [];
                    State.currentProject.points.push(milestone);
                    await Persistence.saveProject(State.currentProject);

                    // Vẽ marker mốc trên bản đồ
                    if (LinearModule.map) {
                        L.circleMarker([evaluated.latitude, evaluated.longitude], {
                            radius: 7, fillColor: "#00E676", color: "#ffffff", weight: 2, fillOpacity: 1
                        }).bindPopup(`<b>Mốc #${State.currentProject.points.length} (${milestone.meterMark}m)</b><br>Trái: ${leftPipe} | Phải: ${rightPipe}<br>X:${evaluated.vn2000.x} Y:${evaluated.vn2000.y}`).addTo(LinearModule.markerLayer);
                    }

                    if (navigator.vibrate) navigator.vibrate(150);
                    alert(`✓ Đã chốt mốc #${State.currentProject.points.length} tại mét thứ ${milestone.meterMark}!\nLề Trái: ${leftPipe} - Lề Phải: ${rightPipe}`);
                }
            );
        },

        switchPipeSection() {
            const left = document.getElementById("lineLeftDiameter").value;
            const right = document.getElementById("lineRightDiameter").value;
            alert(`✓ Đã ghi nhận điểm đổi tiết diện ống tại lý trình ${Math.round(this.totalLength)}m!\nĐoạn tiếp theo: Trái [${left}] - Phải [${right}]`);
        }
    };

    /* =========================================================================
       TRỤ CỘT 3B: KHẢO SÁT ĐIỂM HẠNG MỤC CÓ NGỮ CẢNH & CAMERA (PointModule)
       ========================================================================= */
    const PointModule = {
        observedGNSS: null,
        capturedPhotos: [],
        recordedVideoBlob: null,
        stream: null,
        mediaRecorder: null,
        videoChunks: [],

        init() {
            if (!State.currentProject) return;
            const titleEl = document.getElementById("pointProjectTitle");
            const subEl = document.getElementById("pointProjectSubtitle");
            if (titleEl) titleEl.innerText = State.currentProject.name;
            if (subEl) subEl.innerText = `Mã: ${State.currentProject.code} · ${State.currentProject.location || "Vĩnh Long"}`;

            this.resetForm();
            this.renderSavedList();
        },

        resetForm() {
            this.observedGNSS = null;
            this.capturedPhotos = [];
            this.recordedVideoBlob = null;
            const vnEl = document.getElementById("pointVN2000Text");
            const accEl = document.getElementById("pointAccuracyText");
            const noteEl = document.getElementById("pointNoteInput");
            const countEl = document.getElementById("photoCount");
            const timeLine = document.getElementById("cameraTimeline");
            const notice = document.getElementById("videoRecordedNotice");

            if (vnEl) vnEl.innerText = "Chưa thu nhận";
            if (accEl) accEl.innerText = "± -- m";
            if (noteEl) noteEl.value = "";
            if (countEl) countEl.innerText = "0";
            if (timeLine) timeLine.innerHTML = "";
            if (notice) notice.classList.add("hidden");
        },

        capturePointGNSS() {
            const btnText = document.getElementById("btnPointGPSText");
            SmartGNSS.collect20Samples(
                (cur, target) => { if (btnText) btnText.innerText = `⏳ Đang gom GNSS (${cur}/${target})...`; },
                (evaluated) => {
                    if (btnText) btnText.innerText = "◎ Thu nhận Smart GNSS vị trí (20 Mẫu)";
                    PointModule.observedGNSS = evaluated;
                    const vnEl = document.getElementById("pointVN2000Text");
                    const accEl = document.getElementById("pointAccuracyText");
                    if (vnEl) vnEl.innerText = `X:${evaluated.vn2000.x} | Y:${evaluated.vn2000.y}`;
                    if (accEl) accEl.innerText = `± ${evaluated.accuracy} m (Smart 20/20)`;
                    if (navigator.vibrate) navigator.vibrate(100);
                }
            );
        },

        async startCamera() {
            try {
                if (this.stream) this.stopCamera();
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
                    audio: true
                });
                const vInline = document.getElementById("cameraPreview");
                const vFS = document.getElementById("cameraPreviewFS");
                if (vInline) vInline.srcObject = this.stream;
                if (vFS) vFS.srcObject = this.stream;
                const btn = document.getElementById("btnToggleCamera");
                if (btn) btn.innerText = "Đóng Camera";
            } catch (e) {
                alert("Không thể mở camera: " + e.message);
            }
        },

        stopCamera() {
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
                this.stream = null;
            }
            const vInline = document.getElementById("cameraPreview");
            const vFS = document.getElementById("cameraPreviewFS");
            if (vInline) vInline.srcObject = null;
            if (vFS) vFS.srcObject = null;
            const btn = document.getElementById("btnToggleCamera");
            if (btn) btn.innerText = "Mở Camera";
        },

        takeSnapshot() {
            if (!this.stream) {
                alert("Vui lòng mở Camera trước khi chụp.");
                return;
            }

            const video = document.getElementById("cameraPreview");
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Watermark thời gian & Tọa độ VN-2000
            const timeStr = new Date().toLocaleTimeString("vi-VN");
            const secName = document.getElementById("pointSectionSelect").value;
            const vnStr = this.observedGNSS ? `VN2000: X:${this.observedGNSS.vn2000.x} Y:${this.observedGNSS.vn2000.y}` : "TGS GNSS LIVE";

            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
            ctx.fillStyle = "#00E5FF";
            ctx.font = "bold 18px Arial";
            ctx.fillText(`${secName} | ${timeStr} | ${vnStr}`, 20, canvas.height - 18);

            const base64 = canvas.toDataURL("image/jpeg", 0.85);
            this.capturedPhotos.unshift(base64);

            const countEl = document.getElementById("photoCount");
            if (countEl) countEl.innerText = this.capturedPhotos.length;

            const timeLine = document.getElementById("cameraTimeline");
            if (timeLine) {
                const div = document.createElement("div");
                div.className = "timeline-photo";
                div.innerHTML = `<img src="${base64}"><small>${timeStr}</small>`;
                timeLine.prepend(div);
            }
            if (navigator.vibrate) navigator.vibrate(80);
        },

        toggleRecordVideo() {
            if (!this.stream) {
                alert("Vui lòng mở camera trước.");
                return;
            }

            const btnInline = document.getElementById("btnRecordVideo");
            const btnFS = document.getElementById("btnRecordVideoFS");
            const fsBadge = document.getElementById("fsRecBadge");

            if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
                this.videoChunks = [];
                try {
                    this.mediaRecorder = new MediaRecorder(this.stream);
                } catch (e) {
                    alert("Trình duyệt không hỗ trợ MediaRecorder.");
                    return;
                }

                this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.videoChunks.push(e.data); };
                this.mediaRecorder.onstop = () => {
                    this.recordedVideoBlob = new Blob(this.videoChunks, { type: "video/mp4" });
                    const notice = document.getElementById("videoRecordedNotice");
                    if (notice) notice.classList.remove("hidden");
                    if (btnInline) btnInline.innerText = "🔴 Quay Video";
                    if (btnFS) btnFS.classList.remove("recording");
                    if (fsBadge) fsBadge.innerText = "⚪ ĐÃ LƯU VIDEO";
                    alert("✓ Đã lưu video thuyết minh hiện trường!");
                };

                this.mediaRecorder.start();
                if (btnInline) btnInline.innerText = "⏹ Dừng Quay";
                if (btnFS) btnFS.classList.add("recording");
                if (fsBadge) fsBadge.innerText = "🔴 ĐANG QUAY VIDEO...";
            } else if (this.mediaRecorder.state === "recording") {
                this.mediaRecorder.stop();
            }
        },

        async savePointFeature() {
            if (!State.currentProject) return;

            let sectionName = document.getElementById("pointSectionSelect").value;
            if (sectionName === "KHAC") {
                sectionName = document.getElementById("pointCustomSectionInput").value.trim();
                if (!sectionName) {
                    alert("Vui lòng nhập tên cấu kiện cụ thể.");
                    return;
                }
            }

            const objectType = document.getElementById("pointObjectTypeSelect").value;
            const note = document.getElementById("pointNoteInput").value.trim();

            if (!this.observedGNSS) {
                alert("Vui lòng bấm 'Thu nhận Smart GNSS vị trí (20 Mẫu)' trước khi lưu.");
                return;
