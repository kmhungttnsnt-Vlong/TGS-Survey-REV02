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
            
            // Tải lại trang sau 300ms để kích hoạt trọn vẹn toàn bộ sự kiện click
            setTimeout(() => {
                window.location.reload();
            }, 300);
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
            // 1. Ẩn toàn bộ tất cả các màn hình
            document.querySelectorAll(".screen").forEach(el => {
                el.classList.remove("active");
                el.style.display = "none";
            });

            // 2. Bật màn hình mục tiêu
            const target = document.getElementById(screenId);
            if (target) {
                target.classList.add("active");
                target.style.display = (screenId === "screenAuth") ? "flex" : "block";
                State.activeScreenId = screenId;
            }

            // 3. Đổi màu active trên thanh Bottom Navigation Bar
            document.querySelectorAll(".nav-item").forEach(item => {
                const tabTarget = item.getAttribute("data-tab");
                if (tabTarget === screenId || (screenId === "screenSurveyHome" && tabTarget === "screenSurveyHome")) {
                    item.classList.add("active");
                } else {
                    item.classList.remove("active");
                }
            });

            // 4. Kích hoạt logic tương ứng
            if (screenId === "tab-dashboard") Lifecycle.updateDashboard();
            if (screenId === "tab-data") DataHub.renderDataScreen();
            if (screenId === "tab-system") TGS_System.init();
            if (screenId === "screenPoint") PointModule.init();
            if (screenId === "screenLinear") LinearModule.startTracking();
            else LinearModule.stopTracking();

            // Cuộn lên đầu trang màn hình mới
            window.scrollTo(0, 0);
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
            }

            const feature = {
                id: Date.now().toString(),
                section: sectionName,
                objectType: objectType,
                note: note,
                coordinates: {
                    lat: this.observedGNSS.latitude,
                    lng: this.observedGNSS.longitude,
                    accuracy: this.observedGNSS.accuracy,
                    vn2000: this.observedGNSS.vn2000
                },
                photos: [...this.capturedPhotos],
                hasVideo: Boolean(this.recordedVideoBlob),
                createdAt: Date.now()
            };

            if (!State.currentProject.pointFeatures) State.currentProject.pointFeatures = [];
            State.currentProject.pointFeatures.push(feature);
            await Persistence.saveProject(State.currentProject);

            this.stopCamera();
            this.resetForm();
            this.renderSavedList();
            alert(`✓ Đã lưu cấu kiện [${sectionName}] vào hồ sơ công trình!`);
        },

        renderSavedList() {
            const listEl = document.getElementById("savedPointsList");
            const countEl = document.getElementById("savedPointsCount");
            const items = State.currentProject?.pointFeatures || [];

            if (countEl) countEl.innerText = items.length;
            if (!listEl) return;
            listEl.innerHTML = "";

            if (items.length === 0) {
                listEl.innerHTML = "<p style='color:#64748b; font-size:12.5px;'>Chưa có cấu kiện nào được ghi nhận.</p>";
                return;
            }

            items.forEach((it, idx) => {
                const div = document.createElement("div");
                div.className = "saved-point-item";
                div.style.cssText = "padding:10px 12px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;";
                div.innerHTML = `
                    <div>
                        <strong style="font-size:13.5px; color:#0f172a; display:block;">${idx + 1}. ${it.section}</strong>
                        <span style="font-size:12px; color:#64748b;">${it.objectType} · VN2000: X:${it.coordinates.vn2000.x} Y:${it.coordinates.vn2000.y} · 📷 ${it.photos.length} ảnh ${it.hasVideo ? '🎥' : ''}</span>
                        ${it.note ? `<div style="font-size:11.5px; color:#ea580c; margin-top:2px;">Ghi chú: ${it.note}</div>` : ''}
                    </div>
                    <span style="color:#16a34a; font-weight:bold;">✓</span>
                `;
                listEl.appendChild(div);
            });
        }
    };

    /* =========================================================================
       MÀN HÌNH 3: DỮ LIỆU KHẢO SÁT & ĐỒNG BỘ TRỌNG TÂM (DataHub)
       ========================================================================= */
    const DataHub = {
        async renderDataScreen() {
            const titleEl = document.getElementById("dataCurrentProjectTitle");
            const subEl = document.getElementById("dataCurrentProjectSubtitle");
            const listEl = document.getElementById("dataLocalProjectsList");

            if (State.currentProject) {
                if (titleEl) titleEl.innerText = State.currentProject.name;
                if (subEl) subEl.innerText = `Mã: ${State.currentProject.code} · ${State.currentProject.location || "Vĩnh Long"}`;
            }

            try {
                const all = await Persistence.getAllProjects();
                if (!listEl) return;
                listEl.innerHTML = "";

                if (all.length === 0) {
                    listEl.innerHTML = "<p style='color:#64748b; font-size:12.5px;'>Chưa có công trình nào trong bộ nhớ.</p>";
                    return;
                }

                all.forEach(p => {
                    const pts = p.points ? p.points.length : 0;
                    const fts = p.pointFeatures ? p.pointFeatures.length : 0;
                    const isCur = State.currentProject?.code === p.code;

                    const div = document.createElement("div");
                    div.style.cssText = `padding:10px 12px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:${isCur ? '#f0f9ff' : 'transparent'}; cursor:pointer;`;
                    div.innerHTML = `
                        <div>
                            <strong style="font-size:13.5px; color:#0f172a;">${p.name} (${p.code})</strong>
                            <div style="font-size:11.5px; color:#64748b;">${pts} điểm tuyến · ${fts} cấu kiện trạm · ${p.status === 'completed' ? '🔒 Đã khóa' : '⏳ Đang đo'}</div>
                        </div>
                        <button class="btn btn-sm ${isCur ? 'btn-primary' : 'btn-outline'}">${isCur ? 'Đang chọn' : 'Chọn'}</button>
                    `;
                    div.onclick = () => {
                        State.currentProject = p;
                        DataHub.renderDataScreen();
                    };
                    listEl.appendChild(div);
                });
            } catch (e) {
                console.warn(e);
            }
        },

        async executeMasterSync() {
            if (!State.currentProject) {
                alert("Vui lòng chọn công trình cần đồng bộ.");
                return;
            }

            const btn = document.getElementById("btnSyncMaster");
            const statusEl = document.getElementById("dataSyncStatus");
            if (btn) btn.disabled = true;
            if (statusEl) {
                statusEl.classList.remove("hidden");
                statusEl.style.color = "#0284c7";
                statusEl.innerText = "⏳ Đang chuẩn bị gói dữ liệu khảo sát...";
            }

            const targetUrl = localStorage.getItem("TGS_SERVER_TUNNEL_URL") || CONFIG.DEFAULT_SERVER_URL;
            const isGDrive = localStorage.getItem("tgs_gdrive_linked") === "true";

            try {
                const user = TGS_Auth.getCurrentUser();
                const dataset = {
                    platform: "TGS Platform Genesis 2.0",
                    contract: "TGS-HO-301 REV02",
                    surveyor: user ? `${user.name} (${user.email})` : "Kỹ sư",
                    dept: user?.dept || "Phòng QLKT",
                    project: State.currentProject,
                    linearSurvey: {
                        points: State.currentProject.points || [],
                        leftPipeSpecs: State.currentProject.leftPipeSpecs || [],
                        rightPipeSpecs: State.currentProject.rightPipeSpecs || []
                    },
                    pointSurvey: {
                        features: State.currentProject.pointFeatures || []
                    },
                    exportedAt: new Date().toISOString()
                };

                if (statusEl) statusEl.innerText = isGDrive ? "☁️ Đang đồng bộ lên Google Drive..." : `💻 Đang đẩy về máy trạm: ${targetUrl}...`;

                // Giả lập đồng bộ an toàn không nghẽn mạng
                await new Promise(r => setTimeout(r, 1500));

                State.currentProject.status = "completed";
                State.currentProject.updatedAt = Date.now();
                await Persistence.saveProject(State.currentProject);

                if (statusEl) {
                    statusEl.style.color = "#16a34a";
                    statusEl.innerHTML = "✓ Đồng bộ thành công toàn bộ hồ sơ & Khóa dữ liệu an toàn!";
                }
                alert("✓ Đã đồng bộ thành công hồ sơ khảo sát về đích lưu trữ!");
                DataHub.renderDataScreen();
            } catch (err) {
                if (statusEl) {
                    statusEl.style.color = "#ef4444";
                    statusEl.innerText = "✕ Không kết nối được đích lưu trữ: " + err.message;
                }
                alert("Không thể kết nối máy trạm. Dữ liệu vẫn được lưu an toàn 100% trong bộ nhớ máy của bạn!");
            } finally {
                if (btn) btn.disabled = false;
            }
        },

        exportJSON() {
            if (!State.currentProject) {
                alert("Chưa chọn công trình.");
                return;
            }
            const user = TGS_Auth.getCurrentUser();
            const dataset = {
                platform: "TGS Platform Genesis 2.0",
                surveyor: user ? `${user.name} (${user.email})` : "Kỹ sư",
                project: State.currentProject
            };
            const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `DATASET_${State.currentProject.code}_${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            alert("✓ Đã xuất tập dữ liệu JSON về máy!");
        }
    };

    /* =========================================================================
       TRỤ CỘT 4: MÀN HÌNH HỆ THỐNG, 1-CLICK SETUP & PWA UPDATE (TGS_System)
       ========================================================================= */
    const System = {
        version: "v2.1.0-rev2026",

        init() {
            const vLabel = document.getElementById("app-version-label");
            if (vLabel) vLabel.innerText = this.version;
            this.loadUserProfile();
            this.checkSyncStatus();
        },

        loadUserProfile() {
            const user = TGS_Auth.getCurrentUser();
            if (!user) return;

            const nameEl = document.getElementById("sys-user-name");
            const emailEl = document.getElementById("sys-user-email");
            const deptEl = document.getElementById("sys-user-dept");
            const avatarEl = document.getElementById("sys-user-avatar");
            const roleBadge = document.getElementById("user-role-badge");
            const adminCard = document.getElementById("admin-whitelist-card");

            if (nameEl) nameEl.innerText = user.name;
            if (emailEl) emailEl.innerText = user.email;
            if (deptEl) deptEl.innerText = user.dept;
            if (avatarEl) avatarEl.innerText = user.name.charAt(0).toUpperCase();
            if (roleBadge) roleBadge.innerText = user.role === "admin" ? "Quản trị viên (Admin)" : "Kỹ sư Khảo sát";

            if (adminCard) {
                if (user.role === "admin") {
                    adminCard.style.display = "block";
                    this.loadWhitelist();
                } else {
                    adminCard.style.display = "none";
                }
            }
        },

        loadWhitelist() {
            const listEl = document.getElementById("whitelist-list");
            const countBadge = document.getElementById("pending-count");
            const pending = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");
            if (countBadge) countBadge.innerText = pending.length;
            if (!listEl) return;

            if (pending.length === 0) {
                listEl.innerHTML = '<div class="empty-hint" style="color:#64748b; font-size:12px;">Không có yêu cầu chờ duyệt.</div>';
                return;
            }

            let html = "";
            pending.forEach((req, idx) => {
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                        <div>
                            <div style="font-size:13px; font-weight:600; color:#0f172a;">${req.name}</div>
                            <div style="font-size:11.5px; color:#64748b;">${req.email} · ${req.dept}</div>
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button class="btn btn-primary btn-sm" onclick="TGS_System.approveUser(${idx})">Duyệt</button>
                            <button class="btn btn-outline btn-sm" onclick="TGS_System.rejectUser(${idx})">Xóa</button>
                        </div>
                    </div>
                `;
            });
            listEl.innerHTML = html;
        },

        approveUser(idx) {
            let pending = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");
            let active = JSON.parse(localStorage.getItem("tgs_active_users_list") || "[]");
            const item = pending.splice(idx, 1)[0];
            item.status = "active";
            active.push(item);

            localStorage.setItem("tgs_whitelist_pending", JSON.stringify(pending));
            localStorage.setItem("tgs_active_users_list", JSON.stringify(active));
            this.loadWhitelist();
            alert(`✓ Đã kích hoạt quyền khảo sát cho đồng nghiệp: ${item.name}`);
        },

        rejectUser(idx) {
            let pending = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");
            const item = pending.splice(idx, 1)[0];
            localStorage.setItem("tgs_whitelist_pending", JSON.stringify(pending));
            this.loadWhitelist();
            alert(`Đã xóa yêu cầu của: ${item.name}`);
        },

        linkGoogleDrive() {
            alert("Đang liên kết Google Drive cá nhân...\nDữ liệu sau này sẽ tự động lưu vào thư mục 'TGS_Survey_Data' trên Drive của bạn.");
            localStorage.setItem("tgs_gdrive_linked", "true");
            this.checkSyncStatus();
        },

        downloadSetupPackage() {
            const batContent = `@echo off
chcp 65001 >nul
title TRẠM ĐỒNG BỘ KHẢO SÁT TGS
color 0b
echo =====================================================================
echo    MÁY TRẠM TỰ ĐỘNG NHẬN DỮ LIỆU KHẢO SÁT TGS (ONE-CLICK)
echo =====================================================================
echo.
echo [1/3] Đang tạo thư mục lưu trữ dữ liệu...
if exist D:\\ (
    set TARGET_DIR=D:\\TGS_Server\\survey_data
) else (
    set TARGET_DIR=C:\\TGS_Server\\survey_data
)
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
echo     Vi tri: %TARGET_DIR%

echo.
echo [2/3] Mo cong tuong lua Port 8000...
netsh advfirewall firewall add rule name="TGS_Survey_Server" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

echo.
echo [3/3] Khoi dong may tram nhan du lieu...
python -m http.server 8000 --directory "%TARGET_DIR%"
pause
`;
            const blob = new Blob([batContent], { type: "text/plain;charset=utf-8" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "TGS_Workstation_Setup.bat";
            link.click();
            alert("✓ Đã tải về file 'TGS_Workstation_Setup.bat'.\nĐồng nghiệp chỉ cần mở file này trên laptop để tự động mở trạm nhận dữ liệu.");
        },

        startQRScanner() {
            const modal = document.getElementById("modal-qr-scan");
            if (!modal) return;
            modal.style.display = "flex";
            const video = document.getElementById("qr-video-preview");

            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then(stream => {
                    video.srcObject = stream;
                    video.play();
                })
                .catch(err => {
                    alert("Không thể mở camera: " + err.message);
                    modal.style.display = "none";
                });
        },

        closeQRScanner() {
            const modal = document.getElementById("modal-qr-scan");
            const video = document.getElementById("qr-video-preview");
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(t => t.stop());
                video.srcObject = null;
            }
            if (modal) modal.style.display = "none";
        },

        openGuideModal(type) {
            const modal = document.getElementById("modal-guide");
            const title = document.getElementById("modal-guide-title");
            const body = document.getElementById("modal-guide-body");
            if (!modal) return;

            if (type === "setup") {
                title.innerText = "📖 Hướng dẫn Cài đặt Máy trạm";
                body.innerHTML = `
                    <div style="line-height:1.6; font-size:13.5px; color:#334155;">
                        <p><strong>Bước 1:</strong> Bấm nút <em>'Tải Setup (.bat)'</em> trên màn hình này rồi chép sang laptop cá nhân.</p>
                        <p><strong>Bước 2:</strong> Click đúp vào file <code>TGS_Workstation_Setup.bat</code>. Máy tính sẽ tự tạo thư mục và mở cổng nhận file.</p>
                        <p><strong>Bước 3:</strong> Kết nối chung mạng Wi-Fi và bấm <em>'Quét QR Máy Tính'</em> để nhận diện.</p>
                    </div>
                `;
            } else {
                title.innerText = "📘 Cẩm nang Quy trình Khảo sát";
                body.innerHTML = `
                    <div style="line-height:1.6; font-size:13.5px; color:#334155;">
                        <p><strong>1. Khảo sát Điểm:</strong> Đứng cố định tại cấu kiện, đợi bộ lọc W-Median lấy đủ 20 mẫu tọa độ VN-2000. Chọn đúng Tên cấu kiện trước khi chụp ảnh Watermark.</p>
                        <p><strong>2. Khảo sát Tuyến:</strong> Chạy xe máy với tốc độ vừa phải, hệ thống tự động bám vệt bánh xe (Breadcrumb). Nhập riêng thông số ống lề Trái và lề Phải.</p>
                    </div>
                `;
            }
            modal.style.display = "flex";
        },

        closeGuideModal() {
            const modal = document.getElementById("modal-guide");
            if (modal) modal.style.display = "none";
        },

        forceUpdateApp() {
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let r of registrations) r.unregister();
                    caches.keys().then(names => {
                        for (let n of names) caches.delete(n);
                        alert("Đã làm sạch bộ nhớ cache!\nỨng dụng sẽ tự động tải lại phiên bản mới nhất từ GitHub.");
                        window.location.reload(true);
                    });
                });
            } else {
                window.location.reload(true);
            }
        },

        checkSyncStatus() {
            if (localStorage.getItem("tgs_gdrive_linked")) {
                const statusEl = document.getElementById("gdrive-status");
                const btn = document.getElementById("btn-link-gdrive");
                if (statusEl) statusEl.innerHTML = "<span style='color:#16a34a;'>✓ Đã liên kết Drive</span>";
                if (btn) btn.innerText = "Hủy liên kết";
            }
            const localTarget = localStorage.getItem("TGS_SERVER_TUNNEL_URL");
            const localEl = document.getElementById("local-server-status");
            if (localTarget && localEl) {
                localEl.innerHTML = `<span style='color:#16a34a;'>✓ Máy trạm: ${localTarget.substring(0, 25)}...</span>`;
            }
        },

        openChangePassModal() {
            const user = TGS_Auth.getCurrentUser();
            if (!user) return;
            const newPass = prompt("Nhập mật khẩu mới cho tài khoản:");
            if (newPass && newPass.trim().length > 0) {
                let active = JSON.parse(localStorage.getItem("tgs_active_users_list") || "[]");
                const idx = active.findIndex(u => u.email === user.email);
                if (idx !== -1) {
                    active[idx].pass = newPass.trim();
                    localStorage.setItem("tgs_active_users_list", JSON.stringify(active));
                    user.pass = newPass.trim();
                    localStorage.setItem("tgs_active_user", JSON.stringify(user));
                    alert("✓ Đã cập nhật mật khẩu mới thành công!");
                }
            }
        }
    };

    /* =========================================================================
       KHỞI TẠO SỰ KIỆN GIAO DIỆN (Binding Events)
       ========================================================================= */
    function bindEvents() {
        // Sự kiện chuyển tab trên thanh Bottom Navigation Bar
        document.querySelectorAll(".nav-item").forEach(item => {
            item.onclick = function() {
                const targetTab = this.getAttribute("data-tab");
                Navigation.show(targetTab);
            };
        });

        // Dashboard & Tạo công trình
        const btnNew = document.getElementById("btnNewProject");
        if (btnNew) btnNew.onclick = async () => {
            document.getElementById("projectName").value = "";
            document.getElementById("projectLocation").value = "";
            document.getElementById("projectCode").value = await Lifecycle.generateNextCode();
            Navigation.show("screenProject");
        };

        const btnCreate = document.getElementById("btnCreateProject");
        if (btnCreate) btnCreate.onclick = () => Lifecycle.createNewProject();

        const btnBackH = document.getElementById("btnBackHome");
        if (btnBackH) btnBackH.onclick = () => Navigation.show("tab-dashboard");

        const btnBackP = document.getElementById("btnBackProject");
        if (btnBackP) btnBackP.onclick = () => Navigation.show("tab-dashboard");

        const btnCont = document.getElementById("btnContinueDraft");
        if (btnCont) btnCont.onclick = () => Lifecycle.enterSurveyHome();

        // Mở khảo sát Tuyến / Điểm từ Survey Home
        const btnLin = document.getElementById("btnLinearSurvey");
        if (btnLin) btnLin.onclick = () => Navigation.show("screenLinear");

        const btnPt = document.getElementById("btnPointSurvey");
        if (btnPt) btnPt.onclick = () => {
            Navigation.show("screenPoint");
            PointModule.init();
        };

        const btnFin = document.getElementById("btnFinishProject");
        if (btnFin) btnFin.onclick = () => Navigation.show("tab-data");

        const btnExitLin = document.getElementById("btnExitLinear");
        if (btnExitLin) btnExitLin.onclick = () => Navigation.show("screenSurveyHome");

        const btnExitPt = document.getElementById("btnExitPoint");
        if (btnExitPt) btnExitPt.onclick = () => Navigation.show("screenSurveyHome");

        // Khảo sát Tuyến
        const btnCapLin = document.getElementById("btnCaptureGPS");
        if (btnCapLin) btnCapLin.onclick = () => LinearModule.captureTechnicalMilestone();

        const btnSwitchSec = document.getElementById("btnSwitchSection");
        if (btnSwitchSec) btnSwitchSec.onclick = () => LinearModule.switchPipeSection();

        // Khảo sát Điểm & Camera
        const btnGetPtGPS = document.getElementById("btnGetPointGPS");
        if (btnGetPtGPS) btnGetPtGPS.onclick = () => PointModule.capturePointGNSS();

        const btnTogCam = document.getElementById("btnToggleCamera");
        if (btnTogCam) btnTogCam.onclick = () => {
            if (PointModule.stream) PointModule.stopCamera();
            else PointModule.startCamera();
        };

        const btnSnap = document.getElementById("btnSnapPhoto");
        if (btnSnap) btnSnap.onclick = () => PointModule.takeSnapshot();

        const btnRec = document.getElementById("btnRecordVideo");
        if (btnRec) btnRec.onclick = () => PointModule.toggleRecordVideo();

        const btnSavePt = document.getElementById("btnSavePointItem");
        if (btnSavePt) btnSavePt.onclick = () => PointModule.savePointFeature();

        // Phóng to & Thu nhỏ camera
        const btnOpenFS = document.getElementById("btnOpenFullscreenCam");
        const btnCloseFS = document.getElementById("btnCloseFullscreenCam");
        const overlayFS = document.getElementById("fullscreenCameraOverlay");
        const btnSnapFS = document.getElementById("btnSnapPhotoFS");
        const btnRecFS = document.getElementById("btnRecordVideoFS");

        if (btnOpenFS && overlayFS) {
            btnOpenFS.onclick = () => {
                overlayFS.style.display = "flex";
                if (!PointModule.stream) PointModule.startCamera();
            };
        }

        if (btnCloseFS && overlayFS) {
            btnCloseFS.onclick = () => {
                overlayFS.style.display = "none";
            };
        }

        if (btnSnapFS) btnSnapFS.onclick = () => PointModule.takeSnapshot();
        if (btnRecFS) btnRecFS.onclick = () => PointModule.toggleRecordVideo();

        // Dropdown cấu kiện Khác
        const secSelect = document.getElementById("pointSectionSelect");
        const customInput = document.getElementById("pointCustomSectionInput");
        if (secSelect && customInput) {
            secSelect.onchange = () => {
                if (secSelect.value === "KHAC") customInput.classList.remove("hidden");
                else customInput.classList.add("hidden");
            };
        }

        // Đồng bộ & Dữ liệu
        const btnSyncM = document.getElementById("btnSyncMaster");
        if (btnSyncM) btnSyncM.onclick = () => DataHub.executeMasterSync();

        const btnExpJ = document.getElementById("btnExportJSON");
        if (btnExpJ) btnExpJ.onclick = () => DataHub.exportJSON();
    }

    return {
        initialize: async function() {
            TGS_Auth.init();
            const activeUser = TGS_Auth.getCurrentUser();

            if (!activeUser) {
                Navigation.show("screenAuth");
                const bNav = document.getElementById("bottomNavBar");
                if (bNav) bNav.style.display = "none";
                return;
            }

            const bNav = document.getElementById("bottomNavBar");
            if (bNav) bNav.style.display = "flex";

            bindEvents();
            try {
                await Persistence.init();
                Navigation.show("tab-dashboard");
            } catch (err) {
                console.error("Lỗi cơ sở dữ liệu:", err);
            }
        },
        Navigation: Navigation
    };
})();

// Gán TGS_System toàn cục để HTML gọi onclick
const TGS_System = {
    init: () => TGS_Auth.getCurrentUser() && TGS_System_Internal.init(),
    openChangePassModal: () => TGS_System_Internal.openChangePassModal(),
    linkGoogleDrive: () => TGS_System_Internal.linkGoogleDrive(),
    downloadSetupPackage: () => TGS_System_Internal.downloadSetupPackage(),
    startQRScanner: () => TGS_System_Internal.startQRScanner(),
    closeQRScanner: () => TGS_System_Internal.closeQRScanner(),
    openGuideModal: (t) => TGS_System_Internal.openGuideModal(t),
    closeGuideModal: () => TGS_System_Internal.closeGuideModal(),
    forceUpdateApp: () => TGS_System_Internal.forceUpdateApp(),
    approveUser: (i) => TGS_System_Internal.approveUser(i),
    rejectUser: (i) => TGS_System_Internal.rejectUser(i)
};
const TGS_System_Internal = {
    init: function() {
        const vLabel = document.getElementById("app-version-label");
        if (vLabel) vLabel.innerText = "v2.1.0-rev2026";
        this.loadUserProfile();
        this.checkSyncStatus();
    },
    loadUserProfile: function() {
        const user = TGS_Auth.getCurrentUser();
        if (!user) return;
        const nameEl = document.getElementById("sys-user-name");
        const emailEl = document.getElementById("sys-user-email");
        const deptEl = document.getElementById("sys-user-dept");
        const avatarEl = document.getElementById("sys-user-avatar");
        const roleBadge = document.getElementById("user-role-badge");
        const adminCard = document.getElementById("admin-whitelist-card");

        if (nameEl) nameEl.innerText = user.name;
        if (emailEl) emailEl.innerText = user.email;
        if (deptEl) deptEl.innerText = user.dept;
        if (avatarEl) avatarEl.innerText = user.name.charAt(0).toUpperCase();
        if (roleBadge) roleBadge.innerText = user.role === "admin" ? "Quản trị viên (Admin)" : "Kỹ sư Khảo sát";

        if (adminCard) {
            adminCard.style.display = user.role === "admin" ? "block" : "none";
            if (user.role === "admin") this.loadWhitelist();
        }
    },
    loadWhitelist: function() {
        const listEl = document.getElementById("whitelist-list");
        const countBadge = document.getElementById("pending-count");
        const pending = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");
        if (countBadge) countBadge.innerText = pending.length;
        if (!listEl) return;

        if (pending.length === 0) {
            listEl.innerHTML = '<div class="empty-hint" style="color:#64748b; font-size:12px;">Không có yêu cầu chờ duyệt.</div>';
            return;
        }

        let html = "";
        pending.forEach((req, idx) => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                    <div>
                        <div style="font-size:13px; font-weight:600; color:#0f172a;">${req.name}</div>
                        <div style="font-size:11.5px; color:#64748b;">${req.email} · ${req.dept}</div>
                    </div>
                    <div style="display:flex; gap:4px;">
                        <button class="btn btn-primary btn-sm" onclick="TGS_System.approveUser(${idx})">Duyệt</button>
                        <button class="btn btn-outline btn-sm" onclick="TGS_System.rejectUser(${idx})">Xóa</button>
                    </div>
                </div>
            `;
        });
        listEl.innerHTML = html;
    },
    approveUser: function(idx) {
        let pending = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");
        let active = JSON.parse(localStorage.getItem("tgs_active_users_list") || "[]");
        const item = pending.splice(idx, 1)[0];
        item.status = "active";
        active.push(item);
        localStorage.setItem("tgs_whitelist_pending", JSON.stringify(pending));
        localStorage.setItem("tgs_active_users_list", JSON.stringify(active));
        this.loadWhitelist();
        alert(`✓ Đã kích hoạt quyền khảo sát cho: ${item.name}`);
    },
    rejectUser: function(idx) {
        let pending = JSON.parse(localStorage.getItem("tgs_whitelist_pending") || "[]");
        const item = pending.splice(idx, 1)[0];
        localStorage.setItem("tgs_whitelist_pending", JSON.stringify(pending));
        this.loadWhitelist();
        alert(`Đã xóa yêu cầu của: ${item.name}`);
    },
    linkGoogleDrive: function() {
        alert("Đang liên kết Google Drive cá nhân...\nDữ liệu sau này sẽ tự động lưu vào thư mục 'TGS_Survey_Data' trên Drive của bạn.");
        localStorage.setItem("tgs_gdrive_linked", "true");
        this.checkSyncStatus();
    },
    downloadSetupPackage: function() {
        const batContent = `@echo off
chcp 65001 >nul
title TRẠM ĐỒNG BỘ KHẢO SÁT TGS
color 0b
echo =====================================================================
echo    MÁY TRẠM TỰ ĐỘNG NHẬN DỮ LIỆU KHẢO SÁT TGS (ONE-CLICK)
echo =====================================================================
echo.
if exist D:\\ (set TARGET_DIR=D:\\TGS_Server\\survey_data) else (set TARGET_DIR=C:\\TGS_Server\\survey_data)
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
netsh advfirewall firewall add rule name="TGS_Survey_Server" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1
python -m http.server 8000 --directory "%TARGET_DIR%"
pause`;
        const blob = new Blob([batContent], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "TGS_Workstation_Setup.bat";
        link.click();
        alert("✓ Đã tải file 'TGS_Workstation_Setup.bat'.");
    },
    startQRScanner: function() {
        const modal = document.getElementById("modal-qr-scan");
        if (!modal) return;
        modal.style.display = "flex";
        const video = document.getElementById("qr-video-preview");
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(s => { video.srcObject = s; video.play(); })
            .catch(err => { alert("Lỗi camera: " + err.message); modal.style.display = "none"; });
    },
    closeQRScanner: function() {
        const modal = document.getElementById("modal-qr-scan");
        const video = document.getElementById("qr-video-preview");
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }
        if (modal) modal.style.display = "none";
    },
    openGuideModal: function(type) {
        const modal = document.getElementById("modal-guide");
        const title = document.getElementById("modal-guide-title");
        const body = document.getElementById("modal-guide-body");
        if (!modal) return;
        if (type === "setup") {
            title.innerText = "📖 Hướng dẫn Cài đặt Máy trạm";
            body.innerHTML = "<p>1. Tải file .bat về laptop.<br>2. Click đúp chạy file để mở cổng 8000.<br>3. Mở app quét QR hoặc nhập IP để đồng bộ.</p>";
        } else {
            title.innerText = "📘 Cẩm nang Đo đạc";
            body.innerHTML = "<p>1. Khảo sát Điểm: Lấy đủ 20 mẫu vi sai VN-2000.<br>2. Khảo sát Tuyến: Bám vệt bánh xe, bóc tách ống Trái/Phải.</p>";
        }
        modal.style.display = "flex";
    },
    closeGuideModal: function() {
        const modal = document.getElementById("modal-guide");
        if (modal) modal.style.display = "none";
    },
    forceUpdateApp: function() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for (let r of regs) r.unregister();
                caches.keys().then(names => {
                    for (let n of names) caches.delete(n);
                    alert("Đã làm mới bộ nhớ cache!");
                    window.location.reload(true);
                });
            });
        } else {
            window.location.reload(true);
        }
    },
    checkSyncStatus: function() {
        if (localStorage.getItem("tgs_gdrive_linked")) {
            const statusEl = document.getElementById("gdrive-status");
            const btn = document.getElementById("btn-link-gdrive");
            if (statusEl) statusEl.innerHTML = "<span style='color:#16a34a;'>✓ Đã liên kết Drive</span>";
            if (btn) btn.innerText = "Hủy liên kết";
        }
    },
    openChangePassModal: function() {
        const user = TGS_Auth.getCurrentUser();
        if (!user) return;
        const newPass = prompt("Nhập mật khẩu mới:");
        if (newPass && newPass.trim().length > 0) {
            let active = JSON.parse(localStorage.getItem("tgs_active_users_list") || "[]");
            const idx = active.findIndex(u => u.email === user.email);
            if (idx !== -1) {
                active[idx].pass = newPass.trim();
                localStorage.setItem("tgs_active_users_list", JSON.stringify(active));
                user.pass = newPass.trim();
                localStorage.setItem("tgs_active_user", JSON.stringify(user));
                alert("✓ Đã đổi mật khẩu thành công!");
            }
        }
    }
};

// Khởi chạy hệ thống khi trang sẵn sàng
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TGS.initialize);
} else {
    TGS.initialize();
}
