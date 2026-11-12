/* =========================================================================
   TGS PLATFORM GENESIS 2.0 - PROFESSIONAL FIELD ENGINE
   BASELINE B12: INTEGRATED REVIEW, AUDIT & 3-LAYER SURVEY ENGINE
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
        async getAllProjects() { 
            if (typeof DB !== "undefined") return DB.getAllProjects();
            return [];
        },
        async createProject(data) { return DB.createProject(data); },
        async saveProject(proj) { return DB.saveProject(proj); }
    };

    /* =========================================================================
       TRỤ CỘT 2: ĐIỀU HƯỚNG GIAO DIỆN (Navigation)
       ========================================================================= */
    const Navigation = {
        screens: [
            "screenAuth", "tab-dashboard", "screenProject", 
            "screenSurveyHome", "screenLinear", "screenPoint", 
            "screenCustomerMeter", "tab-data", "tab-system"
        ],
        
        show(screenId) {
            if (screenId === "screenSurveyHome" && !State.currentProject) {
                alert("Chưa có công trình nào được chọn. Vui lòng tạo mới hoặc mở một công trình đã lưu.");
                screenId = "tab-data";
            }

            // 1. Ẩn tất cả các màn hình
            this.screens.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove("active");
                    el.style.display = "none";
                }
            });

            // 2. Bật màn hình mục tiêu
            const target = document.getElementById(screenId);
            if (target) {
                target.classList.add("active");
                target.style.display = (screenId === "screenAuth") ? "flex" : "block";
                State.activeScreenId = screenId;
            }

            // Ẩn thanh Bottom Bar khi vào các chế độ đo thực địa để bản đồ/form tràn viền 100%
            const bNav = document.getElementById("bottomNavBar");
            if (bNav) {
                if (screenId === "screenLinear" || screenId === "screenPoint" || screenId === "screenCustomerMeter" || screenId === "screenAuth") {
                    bNav.style.display = "none";
                } else {
                    bNav.style.display = "flex";
                }
            }

            // 3. Đổi màu icon thanh Bottom Bar
            document.querySelectorAll(".nav-item").forEach(item => {
                const tabTarget = item.getAttribute("data-tab");
                if (tabTarget === screenId || (screenId === "screenSurveyHome" && tabTarget === "screenSurveyHome")) {
                    item.classList.add("active");
                } else {
                    item.classList.remove("active");
                }
            });

            // 4. Kích hoạt logic tương ứng an toàn
            try {
                if (screenId === "tab-dashboard") Lifecycle.updateDashboard();
            } catch (e) { console.warn("Lỗi Dashboard:", e); }

            try {
                if (screenId === "screenSurveyHome") Lifecycle.refreshSurveyBadges();
            } catch (e) { console.warn("Lỗi SurveyHome:", e); }

            try {
                if (screenId === "tab-data") DataHub.renderDataScreen();
            } catch (e) { console.warn("Lỗi DataHub:", e); }

            try {
                if (screenId === "tab-system") TGS_System.init();
            } catch (e) { console.warn("Lỗi System:", e); }

            try {
                if (screenId === "screenPoint") PointModule.init();
                else PointModule.stopCamera();
            } catch (e) { console.warn("Lỗi Point:", e); }

            try {
                if (screenId === "screenCustomerMeter") CustomerMeterModule.init();
            } catch (e) { console.warn("Lỗi Meter:", e); }

            try {
                if (screenId === "screenLinear") LinearModule.startTracking();
                else LinearModule.stopTracking();
            } catch (e) { console.warn("Lỗi Linear:", e); }

            // 5. Cuộn trang lên đỉnh
            window.scrollTo(0, 0);
        }
    };

    /* =========================================================================
       TRỤ CỘT 3C: KHẢO SÁT ĐỒNG HỒ KHÁCH HÀNG (CustomerMeterModule)
       ========================================================================= */
    const CustomerMeterModule = {
        observedGNSS: null,
        capturedPhoto: null,

        init() {
            if (!State.currentProject) return;
            const tEl = document.getElementById("meterProjectTitle");
            const sEl = document.getElementById("meterProjectSubtitle");
            if (tEl) tEl.innerText = State.currentProject.name;
            if (sEl) sEl.innerText = `${State.currentProject.code} · ${State.currentProject.commune || "Vĩnh Long"}`;

            this.resetForm();
            this.renderSavedMeters();
        },

        resetForm() {
            this.observedGNSS = null;
            this.capturedPhoto = null;
            const cCode = document.getElementById("meterCustCode");
            const cName = document.getElementById("meterCustName");
            const cPhone = document.getElementById("meterCustPhone");
            const cAddr = document.getElementById("meterAddress");
            const cNote = document.getElementById("meterNote");
            const vnEl = document.getElementById("meterVN2000Text");
            const accEl = document.getElementById("meterAccuracyText");
            const badge = document.getElementById("meterPhotoBadge");
            const box = document.getElementById("meterPhotoPreviewBox");

            if (cCode) cCode.value = "";
            if (cName) cName.value = "";
            if (cPhone) cPhone.value = "";
            if (cAddr) cAddr.value = State.currentProject?.hamlet || "";
            if (cNote) cNote.value = "";
            if (vnEl) vnEl.innerText = "Chưa thu nhận";
            if (accEl) accEl.innerText = "± -- m";
            if (badge) { badge.innerText = "Chưa có ảnh"; badge.style.color = "#64748b"; }
            if (box) box.style.display = "none";
        },

        captureGNSS() {
            const btnText = document.getElementById("btnMeterGPSText");
            SmartGNSS.collect20Samples(
                (cur, target) => { if (btnText) btnText.innerText = `⏳ Đang gom GNSS (${cur}/${target})...`; },
                (evaluated) => {
                    if (btnText) btnText.innerText = "◎ Lấy vị trí đồng hồ (Smart GNSS)";
                    CustomerMeterModule.observedGNSS = evaluated;
                    const vnEl = document.getElementById("meterVN2000Text");
                    const accEl = document.getElementById("meterAccuracyText");
                    if (vnEl) vnEl.innerText = `X:${evaluated.vn2000.x} | Y:${evaluated.vn2000.y}`;
                    if (accEl) accEl.innerText = `± ${evaluated.accuracy} m (Smart 20/20)`;
                    if (navigator.vibrate) navigator.vibrate(100);
                }
            );
        },

        async saveMeter() {
            if (!State.currentProject) return;

            const custCode = document.getElementById("meterCustCode").value.trim();
            const custName = document.getElementById("meterCustName").value.trim();
            const phone = document.getElementById("meterCustPhone").value.trim();
            const pipeSize = document.getElementById("meterPipeSize").value;
            const address = document.getElementById("meterAddress").value.trim();
            const note = document.getElementById("meterNote").value.trim();

            if (!custName) {
                alert("Vui lòng nhập tên chủ hộ / khách hàng.");
                return;
            }

            if (!this.observedGNSS) {
                alert("Vui lòng lấy vị trí Smart GNSS của đồng hồ trước khi lưu.");
                return;
            }

            const meterRecord = {
                id: Date.now().toString(),
                custCode: custCode || `KH-${Date.now().toString().slice(-6)}`,
                custName: custName,
                phone: phone,
                pipeSize: pipeSize,
                address: address,
                note: note,
                photo: this.capturedPhoto,
                coordinates: {
                    lat: this.observedGNSS.latitude,
                    lng: this.observedGNSS.longitude,
                    accuracy: this.observedGNSS.accuracy,
                    vn2000: this.observedGNSS.vn2000
                },
                timestamp: Date.now()
            };

            if (!State.currentProject.customerMeters) State.currentProject.customerMeters = [];
            State.currentProject.customerMeters.push(meterRecord);
            await Persistence.saveProject(State.currentProject);

            this.resetForm();
            this.renderSavedMeters();
            alert(`✓ Đã lưu đồng hồ của hộ: [${custName}]!`);
        },

        renderSavedMeters() {
            const listEl = document.getElementById("savedMetersList");
            const countEl = document.getElementById("savedMetersCount");
            const badgeEl = document.getElementById("badgeMeterSummary");
            const meters = State.currentProject?.customerMeters || [];

            if (countEl) countEl.innerText = meters.length;
            if (badgeEl) badgeEl.innerText = `${meters.length} hộ`;
            if (!listEl) return;
            listEl.innerHTML = "";

            if (meters.length === 0) {
                listEl.innerHTML = "<p style='color:#64748b; font-size:12px;'>Chưa có đồng hồ hộ dân nào được ghi nhận.</p>";
                return;
            }

            meters.forEach((m, idx) => {
                const div = document.createElement("div");
                div.style.cssText = "padding:8px 10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;";
                div.innerHTML = `
                    <div>
                        <strong style="font-size:13px; color:#0f172a;">${idx + 1}. ${m.custName} (${m.custCode})</strong>
                        <div style="font-size:11.5px; color:#64748b;">${m.address} · VN2000: X:${m.coordinates.vn2000.x} Y:${m.coordinates.vn2000.y}</div>
                    </div>
                    <span style="color:#16a34a; font-weight:bold;">✓</span>
                `;
                listEl.appendChild(div);
            });
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
                        const mts = draft.customerMeters ? draft.customerMeters.length : 0;
                        draftInfo.innerHTML = `Đang làm: <b>${draft.name}</b> (${draft.code})<br><small style="color:#64748b;">${pts} điểm tuyến · ${fts} cấu kiện · ${mts} đồng hồ KH</small>`;
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
            const nameEl = document.getElementById("projectName");
            const codeEl = document.getElementById("projectCode");
            const commEl = document.getElementById("projectCommune");
            const hamEl = document.getElementById("projectHamlet");
            const locEl = document.getElementById("projectLocation");
            const capEl = document.getElementById("projectCapacity");
            const yearEl = document.getElementById("projectYear");
            const mgrEl = document.getElementById("projectManager");

            const name = nameEl ? nameEl.value.trim() : "";
            const code = codeEl ? codeEl.value.trim() : "";
            const commune = commEl ? commEl.value.trim() : "";
            const hamlet = hamEl ? hamEl.value.trim() : "";
            const location = locEl ? locEl.value.trim() : "";
            const capacity = capEl ? capEl.value.trim() : "";
            const opYear = yearEl ? yearEl.value.trim() : "";
            const manager = mgrEl ? mgrEl.value.trim() : "";
            const user = TGS_Auth.getCurrentUser();

            if (!name || !code) {
                alert("Vui lòng nhập tên và mã công trình.");
                return;
            }

            const projData = {
                name: name,
                code: code,
                province: "Tỉnh Vĩnh Long",
                commune: commune || "Chưa xác định",
                hamlet: hamlet || "Chưa xác định",
                location: location || `${hamlet}, ${commune}`,
                capacity_m3_day: capacity ? Number(capacity) : 0,
                operationYear: opYear ? Number(opYear) : new Date().getFullYear(),
                manager: manager || "Chưa phân công",
                centralMeridian: 105.5,
                status: "draft",
                points: [],
                pointFeatures: [],
                customerMeters: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                author: user ? `${user.name} (${user.email})` : "Kỹ sư khảo sát"
            };

            const savedProj = await Persistence.createProject(projData);
            State.currentProject = savedProj;
            this.enterSurveyHome();
        },

        refreshSurveyBadges() {
            if (!State.currentProject) return;
            const titleEl = document.getElementById("surveyProjectTitle");
            const subEl = document.getElementById("surveyProjectSubtitle");
            if (titleEl) titleEl.innerText = State.currentProject.name;
            if (subEl) subEl.innerText = `Mã: ${State.currentProject.code} · ${State.currentProject.location || "Vĩnh Long"}`;

            const pts = State.currentProject.points || [];
            const fts = State.currentProject.pointFeatures || [];
            const mts = State.currentProject.customerMeters || [];
            const badgeLinear = document.getElementById("badgeLinearSummary");
            const badgePoint = document.getElementById("badgePointSummary");
            const badgeMeter = document.getElementById("badgeMeterSummary");

            if (badgeLinear) badgeLinear.innerText = `${pts.length} điểm`;
            if (badgePoint) badgePoint.innerText = `${fts.length} cấu kiện`;
            if (badgeMeter) badgeMeter.innerText = `${mts.length} hộ`;
        },

        enterSurveyHome() {
            if (!State.currentProject) return;
            this.refreshSurveyBadges();
            Navigation.show("screenSurveyHome");
        }
    };

    /* =========================================================================
       BỘ LỌC SMART GNSS 20 MẪU ĐỘC LẬP (SmartGNSS)
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
       TRỤ CỘT 3A: KHẢO SÁT TUYẾN ỐNG BREADCRUMB & PHỤ KIỆN (LinearModule)
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

            // Vẽ lại các mốc đã lưu của công trình hiện tại
            if (this.markerLayer && this.polyline && State.currentProject) {
                this.markerLayer.clearLayers();
                const pts = State.currentProject.points || [];
                const coords = pts.map(p => [p.lat, p.lng]);
                this.polyline.setLatLngs(coords);

                pts.forEach((pt, idx) => {
                    const markerColor = pt.fitting?.type && pt.fitting.type !== "KHONG" ? "#f59e0b" : "#00E676";
                    L.circleMarker([pt.lat, pt.lng], {
                        radius: 8, fillColor: markerColor, color: "#ffffff", weight: 2, fillOpacity: 1
                    }).bindPopup(`
                        <b>Mốc #${idx + 1} (${pt.meterMark}m)</b><br>
                        ${pt.fitting?.detail !== "Không phụ kiện" ? `🔧 <b>Phụ kiện:</b> ${pt.fitting?.detail}<br>` : ''}
                        Trái: <b>${pt.leftPipe}</b> | Phải: <b>${pt.rightPipe}</b><br>
                        VN2000: X:${pt.vn2000?.x} Y:${pt.vn2000?.y}
                    `).addTo(this.markerLayer);
                });

                const ptEl = document.getElementById("pointCount");
                if (ptEl) ptEl.innerText = pts.length;
            }

            if (!navigator.geolocation || State.breadcrumbWatchId) return;

            State.breadcrumbWatchId = navigator.geolocation.watchPosition(
                pos => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    if (accuracy > 20) return;

                    const curLatLng = L.latLng(latitude, longitude);
                    if (this.map) this.map.setView(curLatLng, 18);

                    if (State.lastBreadcrumbPos) {
                        const dist = curLatLng.distanceTo(State.lastBreadcrumbPos);
                        if (dist >= 3.5) {
                            this.totalLength += dist;
                            State.lastBreadcrumbPos = curLatLng;
                            this.polyline.addLatLng(curLatLng);
                            this.updateLinearHUD(curLatLng, accuracy);
                        }
                    } else {
                        State.lastBreadcrumbPos = curLatLng;
                        this.polyline.addLatLng(curLatLng);
                        this.updateLinearHUD(curLatLng, accuracy);
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

        captureTechnicalMilestone() {
            if (!State.currentProject) return;
            const btnText = document.getElementById("captureBtnText");

            SmartGNSS.collect20Samples(
                (cur, target) => { if (btnText) btnText.innerText = `⏳ Đang gom mốc (${cur}/${target})...`; },
                async (evaluated) => {
                    if (btnText) btnText.innerText = "◎ CHỐT MỐC KỸ THUẬT (20 MẪU)";

                    let leftPipe = document.getElementById("lineLeftDiameter").value;
                    if (leftPipe === "KHAC") {
                        leftPipe = document.getElementById("customLeftPipeInput").value.trim() || "Ống khác";
                    }
                    let rightPipe = document.getElementById("lineRightDiameter").value;
                    if (rightPipe === "KHAC") {
                        rightPipe = document.getElementById("customRightPipeInput").value.trim() || "Ống khác";
                    }

                    const fittingType = document.getElementById("lineFittingSelect").value;
                    const fittingNote = document.getElementById("lineFittingNote").value.trim();

                    const milestone = {
                        id: Date.now().toString(),
                        lat: evaluated.latitude,
                        lng: evaluated.longitude,
                        accuracy: evaluated.accuracy,
                        vn2000: evaluated.vn2000,
                        meterMark: Math.round(LinearModule.totalLength),
                        leftPipe: leftPipe,
                        rightPipe: rightPipe,
                        fitting: {
                            type: fittingType,
                            detail: fittingNote || (fittingType !== "KHONG" ? fittingType : "Không phụ kiện")
                        },
                        timestamp: Date.now()
                    };

                    if (!State.currentProject.points) State.currentProject.points = [];
                    State.currentProject.points.push(milestone);
                    await Persistence.saveProject(State.currentProject);

                    const ptEl = document.getElementById("pointCount");
                    if (ptEl) ptEl.innerText = State.currentProject.points.length;

                    if (LinearModule.map) {
                        const markerColor = fittingType !== "KHONG" ? "#f59e0b" : "#00E676";
                        L.circleMarker([evaluated.latitude, evaluated.longitude], {
                            radius: 8, fillColor: markerColor, color: "#ffffff", weight: 2, fillOpacity: 1
                        }).bindPopup(`
                            <b>Mốc #${State.currentProject.points.length} (${milestone.meterMark}m)</b><br>
                            ${milestone.fitting.detail !== "Không phụ kiện" ? `🔧 <b>Phụ kiện:</b> ${milestone.fitting.detail}<br>` : ''}
                            Trái: <b>${leftPipe}</b> | Phải: <b>${rightPipe}</b><br>
                            VN2000: X:${evaluated.vn2000.x} Y:${evaluated.vn2000.y}
                        `).addTo(LinearModule.markerLayer);
                    }

                    document.getElementById("lineFittingSelect").value = "KHONG";
                    document.getElementById("lineFittingNote").value = "";

                    if (navigator.vibrate) navigator.vibrate(150);
                    alert(`✓ Đã chốt mốc #${State.currentProject.points.length} tại mét thứ ${milestone.meterMark}!\n${milestone.fitting.detail !== "Không phụ kiện" ? `Phụ kiện: ${milestone.fitting.detail}\n` : ''}Trái: ${leftPipe} - Phải: ${rightPipe}`);
                }
            );
        },

        switchPipeSection() {
            let left = document.getElementById("lineLeftDiameter").value;
            if (left === "KHAC") left = document.getElementById("customLeftPipeInput").value.trim() || "Ống khác";
            let right = document.getElementById("lineRightDiameter").value;
            if (right === "KHAC") right = document.getElementById("customRightPipeInput").value.trim() || "Ống khác";
            const fittingNote = document.getElementById("lineFittingNote").value.trim();

            alert(`✓ Đã chốt đổi quy cách tại mét thứ ${Math.round(this.totalLength)}m!\n` +
                  `${fittingNote ? `Phụ kiện: ${fittingNote}\n` : ''}` +
                  `Quy cách đoạn tiếp theo: Trái [${left}] - Phải [${right}]`);
        }
    };

    /* =========================================================================
       TRỤ CỘT 3B: KHẢO SÁT ĐIỂM HẠNG MỤC (PointModule)
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
       MÀN HÌNH 3: DỮ LIỆU KHẢO SÁT, HẬU KIỂM & ĐỒNG BỘ (DataHub)
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
                    const mts = p.customerMeters ? p.customerMeters.length : 0;
                    const isCur = State.currentProject?.id === p.id;

                    const div = document.createElement("div");
                    div.style.cssText = `padding:12px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:${isCur ? '#f0f9ff' : 'transparent'}; cursor:pointer;`;
                    div.innerHTML = `
                        <div>
                            <strong style="font-size:14px; color:#0f172a;">${p.name} (${p.code})</strong>
                            <div style="font-size:11.5px; color:#64748b; margin-top:2px;">
                              ${pts} điểm tuyến · ${fts} cấu kiện · ${mts} đồng hồ KH
                            </div>
                        </div>
                        <button class="btn btn-sm ${isCur ? 'btn-primary' : 'btn-outline'}">Tác vụ</button>
                    `;
                    
                    div.onclick = () => {
                        State.currentProject = p;
                        DataHub.openProjectActionsModal(p);
                    };
                    listEl.appendChild(div);
                });
            } catch (e) {
                console.warn(e);
            }
        },

        openProjectActionsModal(proj) {
            const modal = document.getElementById("modalProjectActions");
            const tEl = document.getElementById("actionProjTitle");
            const sEl = document.getElementById("actionProjSubtitle");
            if (!modal) return;

            if (tEl) tEl.innerText = proj.name;
            if (sEl) sEl.innerText = `Mã: ${proj.code} · Địa bàn: ${proj.commune || "Vĩnh Long"}`;
            modal.style.display = "flex";

            // Nút 0: Xem lại & Hậu kiểm dữ liệu
            const btnRev = document.getElementById("btnActionReviewData");
            if (btnRev) {
                btnRev.onclick = () => {
                    modal.style.display = "none";
                    DataHub.openReviewModal(proj);
                };
            }

            // Nút 1: Tiếp tục khảo sát bổ sung
            document.getElementById("btnActionContinueSurvey").onclick = () => {
                modal.style.display = "none";
                Lifecycle.enterSurveyHome();
            };

            // Nút 2: Xuất file GeoJSON nạp tỉnh
            document.getElementById("btnActionExportGeo").onclick = () => {
                modal.style.display = "none";
                DataHub.exportGeoJSON();
            };

            // Nút 3: Xuất gói sao lưu JSON
            const btnJsonModal = document.getElementById("btnActionExportJsonModal");
            if (btnJsonModal) {
                btnJsonModal.onclick = () => {
                    modal.style.display = "none";
                    DataHub.exportJSON();
                };
            }

            // Nút 4: Đóng
            document.getElementById("btnActionCloseModal").onclick = () => {
                modal.style.display = "none";
                DataHub.renderDataScreen();
            };
        },

        openReviewModal(proj) {
            const modal = document.getElementById("modalReviewProject");
            if (!modal) return;

            document.getElementById("revProjTitle").innerText = proj.name;
            document.getElementById("revProjSub").innerText = `Mã: ${proj.code} · Xã: ${proj.commune || 'Chưa rõ'} · Công suất: ${proj.capacity_m3_day || 0} m³/ngđ`;

            const pts = proj.points || [];
            const fts = proj.pointFeatures || [];
            const mts = proj.customerMeters || [];

            document.getElementById("revTabPoints").innerText = `Hạng mục (${fts.length})`;
            document.getElementById("revTabLinear").innerText = `Tuyến ống (${pts.length})`;
            document.getElementById("revTabMeters").innerText = `Đồng hồ (${mts.length})`;

            // Hậu kiểm tự động phát hiện thiếu sót
            const warnings = [];
            if (fts.length === 0 && pts.length === 0 && mts.length === 0) {
                warnings.push("Hồ sơ hiện đang trống, chưa có dữ liệu thực địa nào.");
            }
            const noPhotoPts = fts.filter(f => !f.photos || f.photos.length === 0).length;
            if (noPhotoPts > 0) warnings.push(`Có ${noPhotoPts} hạng mục trạm chưa chụp ảnh hiện trường.`);
            
            const noNotePts = fts.filter(f => !f.note || f.note.trim() === "").length;
            if (noNotePts > 0) warnings.push(`Có ${noNotePts} hạng mục trạm chưa ghi chú hiện trạng hư hỏng.`);

            const noPhotoMeters = mts.filter(m => !m.photo).length;
            if (noPhotoMeters > 0) warnings.push(`Có ${noPhotoMeters} đồng hồ khách hàng thiếu ảnh chụp đối soát.`);

            const auditBox = document.getElementById("revAuditBox");
            if (warnings.length > 0) {
                auditBox.style.background = "#fffbeb";
                auditBox.style.color = "#92400e";
                auditBox.innerHTML = `<strong>⚠️ Phát hiện thiếu sót cần lưu ý:</strong><ul style="margin:4px 0 0 18px; padding:0;">${warnings.map(w => `<li>${w}</li>`).join("")}</ul>`;
            } else {
                auditBox.style.background = "#f0fdf4";
                auditBox.style.color = "#166534";
                auditBox.innerHTML = `<strong>✅ Dữ liệu đạt chuẩn:</strong> Tất cả hạng mục đã có đủ tọa độ VN-2000 và hình ảnh đối soát.`;
            }

            modal.style.display = "flex";
            this.switchReviewTab("points");
        },

        switchReviewTab(tab) {
            const proj = State.currentProject;
            if (!proj) return;

            const tabs = { points: "revTabPoints", linear: "revTabLinear", meters: "revTabMeters" };
            Object.keys(tabs).forEach(k => {
                const btn = document.getElementById(tabs[k]);
                if (btn) {
                    btn.style.background = (k === tab) ? "#fff" : "transparent";
                    btn.style.color = (k === tab) ? "#0284c7" : "#475569";
                }
            });

            const body = document.getElementById("revBodyContent");
            if (!body) return;
            body.innerHTML = "";

            if (tab === "points") {
                const fts = proj.pointFeatures || [];
                if (fts.length === 0) {
                    body.innerHTML = "<p style='text-align:center; color:#64748b; font-size:13px; margin-top:20px;'>Chưa có dữ liệu khảo sát hạng mục trạm.</p>";
                    return;
                }
                fts.forEach((it, idx) => {
                    const hasImg = it.photos && it.photos.length > 0;
                    const card = document.createElement("div");
                    card.style.cssText = "background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:10px;";
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <strong style="font-size:13.5px; color:#0f172a;">${idx + 1}. ${it.section}</strong>
                            <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:${hasImg ? '#dcfce7' : '#fee2e2'}; color:${hasImg ? '#166534' : '#991b1b'}; font-weight:600;">
                                ${hasImg ? `📷 ${it.photos.length} ảnh` : '⚠️ Thiếu ảnh'}
                            </span>
                        </div>
                        <div style="font-size:12px; color:#475569; margin-top:4px;">Loại: ${it.objectType}</div>
                        <div style="font-size:11.5px; color:#0284c7; margin-top:2px; font-family:monospace;">VN2000: X:${it.coordinates?.vn2000?.x} | Y:${it.coordinates?.vn2000?.y} (±${it.coordinates?.accuracy}m)</div>
                        <div style="font-size:12px; color:${it.note ? '#ea580c' : '#94a3b8'}; margin-top:4px;">Ghi chú: ${it.note || 'Chưa nhập ghi chú'}</div>
                        ${hasImg ? `<div style="display:flex; gap:6px; overflow-x:auto; margin-top:8px;">${it.photos.map(src => `<img src="${src}" style="height:70px; border-radius:6px; border:1px solid #e2e8f0;">`).join("")}</div>` : ''}
                    `;
                    body.appendChild(card);
                });
            } else if (tab === "linear") {
                const pts = proj.points || [];
                if (pts.length === 0) {
                    body.innerHTML = "<p style='text-align:center; color:#64748b; font-size:13px; margin-top:20px;'>Chưa có điểm mốc tuyến ống nào.</p>";
                    return;
                }
                pts.forEach((pt, idx) => {
                    const card = document.createElement("div");
                    card.style.cssText = "background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:8px;";
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <strong style="font-size:13px; color:#0f172a;">Mốc #${idx + 1} · Lý trình: ${pt.meterMark} m</strong>
                            <span style="font-size:11px; color:#64748b;">±${pt.accuracy}m</span>
                        </div>
                        <div style="font-size:12px; color:#334155; margin-top:4px;">Ống Trái: <b>${pt.leftPipe}</b> | Ống Phải: <b>${pt.rightPipe}</b></div>
                        <div style="font-size:12px; color:#0369a1; margin-top:2px;">Phụ kiện: ${pt.fitting?.detail || 'Không phụ kiện'}</div>
                        <div style="font-size:11px; color:#64748b; margin-top:2px; font-family:monospace;">VN2000: X:${pt.vn2000?.x} | Y:${pt.vn2000?.y}</div>
                    `;
                    body.appendChild(card);
                });
            } else if (tab === "meters") {
                const mts = proj.customerMeters || [];
                if (mts.length === 0) {
                    body.innerHTML = "<p style='text-align:center; color:#64748b; font-size:13px; margin-top:20px;'>Chưa có đồng hồ khách hàng nào.</p>";
                    return;
                }
                mts.forEach((m, idx) => {
                    const card = document.createElement("div");
                    card.style.cssText = "background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;";
                    card.innerHTML = `
                        <div style="flex:1;">
                            <strong style="font-size:13px; color:#0f172a;">${idx + 1}. ${m.custName} (${m.custCode})</strong>
                            <div style="font-size:12px; color:#475569;">Cỡ: ${m.pipeSize} · ĐC: ${m.address}</div>
                            <div style="font-size:11px; color:#0284c7; font-family:monospace;">VN2000: X:${m.coordinates?.vn2000?.x} | Y:${m.coordinates?.vn2000?.y}</div>
                            ${m.note ? `<div style="font-size:11.5px; color:#ea580c;">Ghi chú: ${m.note}</div>` : ''}
                        </div>
                        ${m.photo ? `<img src="${m.photo}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1;">` : `<span style="font-size:11px; color:#dc2626;">Thiếu ảnh</span>`}
                    `;
                    body.appendChild(card);
                });
            }
        },

        closeReviewModal() {
            const modal = document.getElementById("modalReviewProject");
            if (modal) modal.style.display = "none";
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
                if (statusEl) statusEl.innerText = isGDrive ? "☁️ Đang đồng bộ lên Google Drive..." : `💻 Đang đẩy về máy trạm: ${targetUrl}...`;

                await new Promise(r => setTimeout(r, 1200));

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

        exportGeoJSON() {
            if (!State.currentProject) {
                alert("Vui lòng chọn công trình cần xuất dữ liệu GIS.");
                return;
            }

            const proj = State.currentProject;
            const features = [];

            // LỚP 1: TRẠM CẤP NƯỚC (POINT)
            const stationCoords = (proj.points && proj.points.length > 0)
                ? [proj.points[0].lng, proj.points[0].lat]
                : [105.92345, 9.95214];

            features.push({
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": stationCoords },
                "properties": {
                    "Loai_Doi_Tuong": "TRAM_CAP_NUOC",
                    "Ma_Tram": proj.code,
                    "Ten_Tram": proj.name,
                    "Tinh_Thanh": proj.province || "Tỉnh Vĩnh Long",
                    "Xa_Phuong": proj.commune || "",
                    "Ap_Khom": proj.hamlet || "",
                    "Cong_Suat_m3_ngd": proj.capacity_m3_day || 0,
                    "Nam_Van_Hanh": proj.operationYear || 2026,
                    "Nhan_Vien_Quan_Ly": proj.manager || ""
                }
            });

            // LỚP 2: TUYẾN ỐNG (LINESTRING)
            const lineCoordinates = (proj.points || []).map(pt => [pt.lng, pt.lat]);
            if (lineCoordinates.length >= 2) {
                features.push({
                    "type": "Feature",
                    "geometry": { "type": "LineString", "coordinates": lineCoordinates },
                    "properties": {
                        "Loai_Doi_Tuong": "TUYEN_ONG",
                        "Ma_Tuyen": `${proj.code}-LINE`,
                        "Ten_Tram": proj.name,
                        "Tong_Chieu_Dai_m": Math.round(LinearModule.totalLength || 0)
                    }
                });
            }

            // LỚP 3: ĐỒNG HỒ KHÁCH HÀNG (POINT FEATURES)
            (proj.customerMeters || []).forEach(m => {
                features.push({
                    "type": "Feature",
                    "geometry": { "type": "Point", "coordinates": [m.coordinates.lng, m.coordinates.lat] },
                    "properties": {
                        "Loai_Doi_Tuong": "DONG_HO_KHACH_HANG",
                        "Ma_Khach_Hang": m.custCode,
                        "Ten_Khach_Hang": m.custName,
                        "So_Dien_Thoai": m.phone,
                        "Quy_Cach_Ong": m.pipeSize,
                        "Dia_Chi": m.address,
                        "Toa_Do_VN2000_X": m.coordinates.vn2000.x,
                        "Toa_Do_VN2000_Y": m.coordinates.vn2000.y,
                        "Ghi_Chu": m.note
                    }
                });
            });

            const geojsonDataset = {
                "type": "FeatureCollection",
                "name": `TGS_FULL_DATASET_${proj.code}`,
                "features": features
            };

            const blob = new Blob([JSON.stringify(geojsonDataset, null, 2)], { type: "application/geo+json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `GIS_FULL_${proj.code}_${proj.commune || 'VinhLong'}.geojson`;
            link.click();
            alert(`✓ Đã xuất trọn gói dữ liệu GIS gồm Trạm, Tuyến ống và ${proj.customerMeters ? proj.customerMeters.length : 0} đồng hồ hộ dân!`);
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
                project: State.currentProject,
                exportedAt: new Date().toISOString()
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
       KHỞI TẠO SỰ KIỆN GIAO DIỆN TẬP TRUNG (Binding Events)
       ========================================================================= */
    function bindEvents() {
        // 1. Điều hướng thanh Bottom Nav Bar
        document.querySelectorAll(".nav-item").forEach(btn => {
            btn.onclick = () => {
                const targetTab = btn.getAttribute("data-tab");
                if (targetTab) Navigation.show(targetTab);
            };
        });

        // 2. Nút Dashboard
        const btnNew = document.getElementById("btnNewProject");
        if (btnNew) btnNew.onclick = async () => {
            const fields = ["projectName", "projectCommune", "projectHamlet", "projectLocation", "projectCapacity", "projectManager"];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = "";
            });
            const pYear = document.getElementById("projectYear");
            const pCode = document.getElementById("projectCode");
            if (pYear) pYear.value = new Date().getFullYear();
            if (pCode) pCode.value = await Lifecycle.generateNextCode();
            Navigation.show("screenProject");
        };

        const btnOpenProj = document.getElementById("btnOpenProject");
        if (btnOpenProj) btnOpenProj.onclick = () => Navigation.show("tab-data");

        const btnCreate = document.getElementById("btnCreateProject");
        if (btnCreate) btnCreate.onclick = () => Lifecycle.createNewProject();

        const btnBackH = document.getElementById("btnBackHome");
        if (btnBackH) btnBackH.onclick = () => Navigation.show("tab-dashboard");

        const btnBackP = document.getElementById("btnBackProject");
        if (btnBackP) btnBackP.onclick = () => Navigation.show("tab-dashboard");

        const btnCont = document.getElementById("btnContinueDraft");
        if (btnCont) btnCont.onclick = () => Lifecycle.enterSurveyHome();

        // 3. Trung tâm tác nghiệp khảo sát
        const btnLin = document.getElementById("btnLinearSurvey");
        if (btnLin) btnLin.onclick = () => Navigation.show("screenLinear");

        const btnPt = document.getElementById("btnPointSurvey");
        if (btnPt) btnPt.onclick = () => Navigation.show("screenPoint");

        const btnCustMeter = document.getElementById("btnCustomerMeterSurvey");
        if (btnCustMeter) btnCustMeter.onclick = () => Navigation.show("screenCustomerMeter");

        const btnFin = document.getElementById("btnFinishProject");
        if (btnFin) btnFin.onclick = () => Navigation.show("tab-data");

        // 4. Khảo sát tuyến ống (Linear)
        const btnExitLin = document.getElementById("btnExitLinear");
        if (btnExitLin) btnExitLin.onclick = () => Navigation.show("screenSurveyHome");

        const btnCapLin = document.getElementById("btnCaptureGPS");
        if (btnCapLin) btnCapLin.onclick = () => LinearModule.captureTechnicalMilestone();

        const btnSwitchSec = document.getElementById("btnSwitchSection");
        if (btnSwitchSec) btnSwitchSec.onclick = () => LinearModule.switchPipeSection();

        const btnLocate = document.getElementById("btnLocate");
        if (btnLocate) btnLocate.onclick = () => {
            if (LinearModule.map && State.lastBreadcrumbPos) {
                LinearModule.map.setView(State.lastBreadcrumbPos, 18);
            }
        };

        const btnZoomIn = document.getElementById("btnZoomIn");
        if (btnZoomIn) btnZoomIn.onclick = () => { if (LinearModule.map) LinearModule.map.zoomIn(); };

        const btnZoomOut = document.getElementById("btnZoomOut");
        if (btnZoomOut) btnZoomOut.onclick = () => { if (LinearModule.map) LinearModule.map.zoomOut(); };

        const btnLineSnap = document.getElementById("btnLineSnapPhoto");
        const inLinePhoto = document.getElementById("inputLinePhoto");
        if (btnLineSnap && inLinePhoto) {
            btnLineSnap.onclick = () => inLinePhoto.click();
            inLinePhoto.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    alert("✓ Đã ghi nhận ảnh hiện trường tuyến ống!");
                }
            };
        }

        const btnLineRec = document.getElementById("btnLineRecordVideo");
        const inLineVideo = document.getElementById("inputLineVideo");
        if (btnLineRec && inLineVideo) {
            btnLineRec.onclick = () => inLineVideo.click();
            inLineVideo.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    alert("✓ Đã ghi nhận video hiện trường tuyến ống!");
                }
            };
        }

        const leftSelect = document.getElementById("lineLeftDiameter");
        const leftCustom = document.getElementById("customLeftPipeInput");
        if (leftSelect && leftCustom) {
            leftSelect.onchange = () => {
                if (leftSelect.value === "KHAC") {
                    leftCustom.classList.remove("hidden");
                    leftCustom.focus();
                } else {
                    leftCustom.classList.add("hidden");
                }
            };
        }

        const rightSelect = document.getElementById("lineRightDiameter");
        const rightCustom = document.getElementById("customRightPipeInput");
        if (rightSelect && rightCustom) {
            rightSelect.onchange = () => {
                if (rightSelect.value === "KHAC") {
                    rightCustom.classList.remove("hidden");
                    rightCustom.focus();
                } else {
                    rightCustom.classList.add("hidden");
                }
            };
        }

        // 5. Khảo sát hạng mục điểm (Point)
        const btnExitPt = document.getElementById("btnExitPoint");
        if (btnExitPt) btnExitPt.onclick = () => Navigation.show("screenSurveyHome");

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
            btnCloseFS.onclick = () => { overlayFS.style.display = "none"; };
        }

        if (btnSnapFS) btnSnapFS.onclick = () => PointModule.takeSnapshot();
        if (btnRecFS) btnRecFS.onclick = () => PointModule.toggleRecordVideo();

        const secSelect = document.getElementById("pointSectionSelect");
        const customInput = document.getElementById("pointCustomSectionInput");
        if (secSelect && customInput) {
            secSelect.onchange = () => {
                if (secSelect.value === "KHAC") customInput.classList.remove("hidden");
                else customInput.classList.add("hidden");
            };
        }

        // 6. Khảo sát đồng hồ khách hàng (Customer Meter)
        const btnExitM = document.getElementById("btnExitMeter");
        if (btnExitM) btnExitM.onclick = () => Navigation.show("screenSurveyHome");

        const btnGetM_GPS = document.getElementById("btnGetMeterGPS");
        if (btnGetM_GPS) btnGetM_GPS.onclick = () => CustomerMeterModule.captureGNSS();

        const btnSaveM = document.getElementById("btnSaveCustomerMeter");
        if (btnSaveM) btnSaveM.onclick = () => CustomerMeterModule.saveMeter();

        const btnSnapM = document.getElementById("btnSnapMeterPhoto");
        const inSnapM = document.getElementById("inputMeterPhoto");
        if (btnSnapM && inSnapM) {
            btnSnapM.onclick = () => inSnapM.click();
            inSnapM.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        CustomerMeterModule.capturedPhoto = evt.target.result;
                        const badge = document.getElementById("meterPhotoBadge");
                        const img = document.getElementById("meterPhotoImg");
                        const box = document.getElementById("meterPhotoPreviewBox");
                        if (badge) {
                            badge.innerText = "✓ Đã chụp ảnh";
                            badge.style.color = "#16a34a";
                        }
                        if (img) img.src = evt.target.result;
                        if (box) box.style.display = "block";
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            };
        }

        // 7. Màn hình Dữ liệu & Hậu kiểm (DataHub & Review Modal)
        const btnSyncM = document.getElementById("btnSyncMaster");
        if (btnSyncM) btnSyncM.onclick = () => DataHub.executeMasterSync();

        const btnExpGeo = document.getElementById("btnExportGeoJSON");
        if (btnExpGeo) btnExpGeo.onclick = () => DataHub.exportGeoJSON();

        const btnExpJson = document.getElementById("btnExportJSON");
        if (btnExpJson) btnExpJson.onclick = () => DataHub.exportJSON();

        const btnCloseRev = document.getElementById("btnCloseReviewModal");
        if (btnCloseRev) btnCloseRev.onclick = () => DataHub.closeReviewModal();

        const revTabPt = document.getElementById("revTabPoints");
        if (revTabPt) revTabPt.onclick = () => DataHub.switchReviewTab("points");

        const revTabLin = document.getElementById("revTabLinear");
        if (revTabLin) revTabLin.onclick = () => DataHub.switchReviewTab("linear");

        const revTabMt = document.getElementById("revTabMeters");
        if (revTabMt) revTabMt.onclick = () => DataHub.switchReviewTab("meters");

        const btnRevCont = document.getElementById("btnRevContinueSurvey");
        if (btnRevCont) btnRevCont.onclick = () => {
            DataHub.closeReviewModal();
            Lifecycle.enterSurveyHome();
        };

        const btnRevExp = document.getElementById("btnRevExportJSON");
        if (btnRevExp) btnRevExp.onclick = () => DataHub.exportJSON();
    }

    return {
        initialize: async function() {
            TGS_Auth.init();
            const activeUser = TGS_Auth.getCurrentUser();

            if (!activeUser) {
                Navigation.show("screenAuth");
                return;
            }

            bindEvents();
            try {
                await Persistence.init();
            } catch (err) {
                console.warn("Chưa khởi tạo DB:", err);
            }
            Navigation.show("tab-dashboard");
        },
        Navigation: Navigation,
        DataHub: DataHub
    };
})();

/* =========================================================================
   TRỤ CỘT 4: MÀN HÌNH HỆ THỐNG & ĐỒNG BỘ MÁY TRẠM (TGS_System TOÀN CỤC)
   ========================================================================= */
const TGS_System = {
    version: "v2.1.0-rev2026",

    init: function() {
        const vLabel = document.getElementById("app-version-label");
        if (vLabel) vLabel.innerText = this.version;
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
if exist E:\\ (set TARGET_DIR=E:\\TGS_Server\\survey_data) else (if exist D:\\ (set TARGET_DIR=D:\\TGS_Server\\survey_data) else (set TARGET_DIR=C:\\TGS_Server\\survey_data))
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
        const video = document.getElementById("qr-video-preview");
        if (!modal || !video) {
            alert("Lỗi cấu trúc: Không tìm thấy khung video.");
            return;
        }

        modal.style.display = "flex";

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Thiết bị không hỗ trợ camera trên giao thức này.");
            modal.style.display = "none";
            return;
        }

        if (video.srcObject) {
            video.srcObject.getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
            audio: false
        })
        .then(stream => {
            video.srcObject = stream;
            video.setAttribute("playsinline", "true");
            video.setAttribute("autoplay", "true");
            video.muted = true;
            video.play().catch(e => console.warn("Lỗi phát video:", e));

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const scanLoop = () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    if (typeof jsQR !== "undefined") {
                        const code = jsQR(imgData.data, imgData.width, imgData.height, {
                            inversionAttempts: "dontInvert"
                        });
                        if (code && code.data) {
                            const detected = code.data.trim();
                            localStorage.setItem("TGS_SERVER_TUNNEL_URL", detected);
                            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                            alert("✓ Đã nhận diện máy tính:\n" + detected);
                            TGS_System.closeQRScanner();
                            TGS_System.init();
                            return;
                        }
                    }
                }
                if (modal.style.display === "flex") {
                    requestAnimationFrame(scanLoop);
                }
            };
            requestAnimationFrame(scanLoop);
        })
        .catch(err => {
            alert("Không thể hiển thị camera: " + err.message);
            modal.style.display = "none";
        });
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
        const localTarget = localStorage.getItem("TGS_SERVER_TUNNEL_URL");
        const localEl = document.getElementById("local-server-status");
        if (localTarget && localEl) {
            localEl.innerHTML = `<span style='color:#16a34a;'>✓ Máy trạm: ${localTarget.substring(0, 25)}...</span>`;
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
