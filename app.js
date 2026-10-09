/* =========================================================
   TGS PLATFORM GENESIS 2.0 - PROFESSIONAL FIELD ENGINE
   BASELINE B9: SPLIT-SCREEN GIS/CAMERA, LINEAR MEDIA & FAILSAFE SYNC
========================================================= */

const TGS = (() => {

    // CẤU HÌNH MẶC ĐỊNH & BẢO MẬT
    const CONFIG = {
        DEFAULT_SERVER_URL: "https://scholarships-amazing-rise-overcome.trycloudflare.com",
        TGS_API_KEY: "TGS_SECURE_TOKEN_2026_VINHLONG",
        ALLOWED_PINS: {
            "8901": { name: "Kim Minh Hùng", role: "Trưởng nhóm" },
            "8902": { name: "Phạm Lý Thái Tâm", role: "Khảo sát viên" },
            "8903": { name: "Nguyễn Tấn Tài", role: "Khảo sát viên" },
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
            return localStorage.getItem("TGS_STORAGE_MODE") || "server";
        },

        getWebhookUrl() {
            if (this.getStorageTarget() === "drive") {
                return localStorage.getItem("TGS_USER_DRIVE_WEBHOOK") || "";
            }
            return localStorage.getItem("TGS_SERVER_TUNNEL_URL") || CONFIG.DEFAULT_SERVER_URL;
        }
    };

    /* =====================================================
       2. QUẢN LÝ HỒ SƠ & VÒNG ĐỜI DỮ LIỆU
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
                    const match = p.code?.match(regex);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                });
                const nextNum = (maxNum + 1).toString().padStart(3, "0");
                return `TGS-${nextNum}`;
            } catch (e) {
                return "TGS-005";
            }
        },

        async verifyDraft() {
            try {
                const all = await A4_Persistence.getAllProjects();
                const banner = document.getElementById("draftBanner");
                const info = document.getElementById("draftProjectInfo");

                if (!all || all.length === 0) {
                    banner.classList.add("hidden");
                    return;
                }

                all.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
                let activeDraft = all.find(p => p.status === "draft" || !p.status);

                if (activeDraft) {
                    A1_State.currentProject = activeDraft;
                    const pts = activeDraft.points ? activeDraft.points.length : 0;
                    const items = activeDraft.pointFeatures ? activeDraft.pointFeatures.length : 0;
                    const lineMedia = activeDraft.linearMedia ? activeDraft.linearMedia.length : 0;

                    info.innerHTML = `Công trình: <b>${activeDraft.name}</b> (${activeDraft.code})<br>` +
                        `<small style="color:#64748B;">Hiện trạng: ${pts} điểm tuyến (${lineMedia} media) · ${items} đối tượng trạm</small>`;
                    banner.classList.remove("hidden");
                } else {
                    banner.classList.add("hidden");
                }
            } catch (err) {
                console.warn("[ProjectLifecycle]", err);
            }
        },

        async createNewProject() {
            const name = document.getElementById("projectName").value.trim();
            const code = document.getElementById("projectCode").value.trim();
            const location = document.getElementById("projectLocation").value.trim();

            if (!name || !code) {
                alert("Vui lòng nhập tên và mã công trình.");
                return;
            }

            try {
                const newProj = await A4_Persistence.createProject({
                    name,
                    code,
                    location,
                    centralMeridian: 105.5,
                    status: "draft",
                    points: [],
                    linearMedia: [],
                    pointFeatures: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    author: A0_AuthManager.currentUser?.name || "KTV Hiện trường"
                });
                A1_State.currentProject = newProj;
                await this.verifyDraft();
                this.enterSurveyHome();
            } catch (err) {
                alert("Không thể khởi tạo công trình: " + err.message);
            }
        },

        enterSurveyHome() {
            if (!A1_State.currentProject) return;
            document.getElementById("surveyProjectTitle").innerText = A1_State.currentProject.name;
            document.getElementById("surveyProjectSubtitle").innerText = 
                `Mã: ${A1_State.currentProject.code} · ${A1_State.currentProject.location || "Chưa rõ địa điểm"}`;

            const lineSum = L4_SurveyLineLogic.getSummary();
            const ptSum = P1_StationWorkflow.getSummary();

            document.getElementById("badgeLinearSummary").innerText = `${lineSum.count} điểm · ${lineSum.lengthText}`;
            document.getElementById("badgePointSummary").innerText = `${ptSum.count} đối tượng`;

            A2_Navigation.show("surveyHome");
        },

        async openCompleteSummary() {
            if (!A1_State.currentProject) return;

            A1_State.currentProject.updatedAt = Date.now();
            await A4_Persistence.saveProject(A1_State.currentProject);

            const lineSummary = L4_SurveyLineLogic.getSummary();
            const stationSummary = P1_StationWorkflow.getSummary();

            document.getElementById("completeProjectName").innerText = A1_State.currentProject.name;
            document.getElementById("completeProjectSummary").innerText = 
                `Mã: ${A1_State.currentProject.code} | Địa điểm: ${A1_State.currentProject.location || "Chưa rõ"}`;

            document.getElementById("summaryPoints").innerText = `${lineSummary.count} điểm (${(A1_State.currentProject.linearMedia || []).length} media)`;
            document.getElementById("summaryLength").innerText = lineSummary.lengthText;
            document.getElementById("summaryStations").innerText = `${stationSummary.count} đối tượng`;

            document.getElementById("driveSyncStatus").classList.add("hidden");
            A2_Navigation.show("complete");
        }
    };

    /* =====================================================
       2.1 QUẢN LÝ MỞ DANH SÁCH CÔNG TRÌNH ĐÃ LƯU
    ===================================================== */
    const A3_ProjectListManager = {
        modal: document.getElementById("modalProjectList"),
        listContainer: document.getElementById("projectListItems"),
        searchInput: document.getElementById("searchProjectInput"),

        async openModal() {
            if (!this.modal) return;
            this.modal.classList.remove("hidden");
            if (this.searchInput) this.searchInput.value = "";
            await this.renderProjects();
        },

        closeModal() {
            if (this.modal) this.modal.classList.add("hidden");
        },

        async renderProjects(keyword = "") {
            if (!this.listContainer) return;
            this.listContainer.innerHTML = "<p style='text-align:center; padding:16px; color:#64748B;'>Đang tải danh sách công trình...</p>";

            try {
                const projects = await A4_Persistence.getAllProjects();
                A1_State.cachedProjects = projects || [];

                if (!projects || projects.length === 0) {
                    this.listContainer.innerHTML = "<p style='text-align:center; padding:24px 16px; color:#94A3B8;'>Chưa có công trình nào được lưu trên thiết bị này.</p>";
                    return;
                }

                projects.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

                const filtered = projects.filter(p => {
                    const term = keyword.toLowerCase();
                    return (p.name || "").toLowerCase().includes(term) || (p.code || "").toLowerCase().includes(term) || (p.location || "").toLowerCase().includes(term);
                });

                if (filtered.length === 0) {
                    this.listContainer.innerHTML = "<p style='text-align:center; padding:20px; color:#94A3B8;'>Không tìm thấy công trình phù hợp.</p>";
                    return;
                }

                this.listContainer.innerHTML = filtered.map(p => {
                    const ptsCount = p.points ? p.points.length : 0;
                    const featsCount = p.pointFeatures ? p.pointFeatures.length : 0;
                    const isDone = p.status === "completed";

                    const statusTag = isDone 
                        ? `<span style="background:#E2E8F0; color:#475569; font-size:11px; padding:2px 8px; border-radius:12px; font-weight:700;">🔒 Đã hoàn thành</span>`
                        : `<span style="background:#FEF9C3; color:#A16207; font-size:11px; padding:2px 8px; border-radius:12px; font-weight:700;">⏳ Chưa hoàn thành</span>`;

                    const btnActionText = isDone ? "Mở / Khảo sát thêm" : "Tiếp tục đo";

                    return `
                        <div class="project-item-card" data-code="${p.code}" style="padding:14px 16px; border-bottom:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                            <div style="flex:1; padding-right:12px;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                    <strong style="font-size:15px; color:#1E293B;">${p.name}</strong>
                                    ${statusTag}
                                </div>
                                <span style="font-size:13px; color:#64748B;">Mã: <b>${p.code}</b> · ${p.location || "Chưa rõ vị trí"}</span>
                                <div style="font-size:12px; color:#0284C7; margin-top:4px;">
                                    📍 ${ptsCount} điểm tuyến · 🏢 ${featsCount} đối tượng trạm
                                </div>
                            </div>
                            <button class="btn-select-proj btn-secondary" data-code="${p.code}" style="padding:6px 12px; font-weight:bold; font-size:12px; white-space:nowrap;">${btnActionText}</button>
                        </div>
                    `;
                }).join("");

                this.listContainer.querySelectorAll(".project-item-card").forEach(item => {
                    item.addEventListener("click", async () => {
                        const code = item.getAttribute("data-code");
                        await A3_ProjectListManager.selectProject(code);
                    });
                });

            } catch (err) {
                console.error("[ProjectListManager]", err);
                this.listContainer.innerHTML = `<p style='text-align:center; padding:16px; color:#EF4444;'>Lỗi đọc dữ liệu: ${err.message}</p>`;
            }
        },

        async selectProject(code) {
            const target = A1_State.cachedProjects.find(p => p.code === code);
            if (!target) return;

            if (target.status === "completed") {
                const reopen = confirm(
                    `Công trình "${target.name}" (${target.code}) đã hoàn thành.\n\n` +
                    `Bạn có muốn MỞ KHÓA để khảo sát bổ sung thêm điểm tuyến / hạng mục không?\n` +
                    `• Bấm OK: Mở khóa để tiếp tục khảo sát bổ sung.\n` +
                    `• Bấm Hủy (Cancel): Chỉ vào xem và xuất hồ sơ báo cáo.`
                );

                if (reopen) {
                    target.status = "draft";
                    target.updatedAt = Date.now();
                    await A4_Persistence.saveProject(target);
                }
            }

            A1_State.currentProject = target;
            this.closeModal();
            await A3_ProjectLifecycle.verifyDraft();
            A3_ProjectLifecycle.enterSurveyHome();
        }
    };

    /* =====================================================
       3. ĐIỀU HƯỚNG MÀN HÌNH
    ===================================================== */
    const A2_Navigation = {
        screens: {
            splash: document.getElementById("screenSplash"),
            projectHome: document.getElementById("screenProjectHome"),
            project: document.getElementById("screenProject"),
            surveyHome: document.getElementById("screenSurveyHome"),
            linear: document.getElementById("screenLinear"),
            point: document.getElementById("screenPoint"),
            reviewMedia: document.getElementById("screenReviewMedia"),
            complete: document.getElementById("screenProjectComplete")
        },

        show(screenKey) {
            const previousScreen = A1_State.currentScreen;
            const targetScreenEl = this.screens[screenKey];
            if (!targetScreenEl) return;

            EventBus.emit("screen:leave", { from: previousScreen, to: screenKey });

            Object.values(this.screens).forEach(scr => {
                if (scr) scr.classList.remove("active");
            });
            targetScreenEl.classList.add("active");
            A1_State.currentScreen = screenKey;

            EventBus.emit("screen:enter", { screen: screenKey });
        }
    };

    /* =====================================================
       4. BẢN ĐỒ GIS & TUYẾN KHẢO SÁT & SPLIT-SCREEN CHIA ĐÔI
    ===================================================== */
    const L1_ResumeManager = {
        resumeLinearSession() {
            if (!A1_State.currentProject) return;
            document.getElementById("linearProjectName").innerText = 
                `${A1_State.currentProject.name} (${A1_State.currentProject.code})`;
            
            A1_State.currentProject.surveyType = "linear";
            A4_Persistence.saveProject(A1_State.currentProject);

            A2_Navigation.show("linear");
            L2_MapEngine.renderRoute(A1_State.currentProject.points || []);
            L4_SurveyLineLogic.updateUI();
            L5_SplitScreenLinearManager.initUI();

            setTimeout(() => {
                L2_MapEngine.invalidate();
                L3_SmartGNSS.getQuickPosition(pos => L2_MapEngine.updateLivePosition(pos));
            }, 300);
        }
    };

    const L2_MapEngine = {
        map: null,
        markerLayer: null,
        polylineLayer: null,
        liveMarker: null,
        accuracyCircle: null,

        init() {
            const mapContainer = document.getElementById("map");
            if (!mapContainer || this.map) return;

            const arcgisUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
            this.map = L.map("map", {
                zoomControl: false,
                attributionControl: false,
                preferCanvas: true
            }).setView([9.95, 106.34], 16);

            L.tileLayer(arcgisUrl, { maxZoom: 19 }).addTo(this.map);
            this.markerLayer = L.layerGroup().addTo(this.map);
            this.polylineLayer = L.polyline([], {
                color: "#00E5FF",
                weight: 4,
                opacity: 0.95
            }).addTo(this.map);
        },

        invalidate() {
            if (!this.map) this.init();
            if (this.map) this.map.invalidateSize();
        },

        renderRoute(points = []) {
            if (!this.map) this.init();
            this.markerLayer.clearLayers();

            const latlngs = [];
            points.forEach((pt, idx) => {
                const pos = [pt.lat, pt.lng];
                latlngs.push(pos);
                L.circleMarker(pos, {
                    radius: 6,
                    fillColor: "#00E676",
                    color: "#FFFFFF",
                    weight: 2,
                    fillOpacity: 1
                }).bindPopup(`<b>Điểm ${idx + 1}</b><br>X: ${pt.vn2000.x}<br>Y: ${pt.vn2000.y}`).addTo(this.markerLayer);
            });

            this.polylineLayer.setLatLngs(latlngs);
            if (latlngs.length > 0) {
                this.map.fitBounds(this.polylineLayer.getBounds(), { padding: [40, 40] });
            }
        },

        updateLivePosition(obs) {
            if (!this.map) this.init();
            const pos = [obs.latitude, obs.longitude];
            this.map.setView(pos, 18);

            if (!this.liveMarker) {
                this.liveMarker = L.circleMarker(pos, {
                    radius: 8,
                    fillColor: "#2979FF",
                    color: "#FFFFFF",
                    weight: 2,
                    fillOpacity: 1
                }).addTo(this.map);

                this.accuracyCircle = L.circle(pos, {
                    radius: obs.accuracy || 15,
                    color: "#2979FF",
                    weight: 1,
                    fillOpacity: 0.15
                }).addTo(this.map);
            } else {
                this.liveMarker.setLatLng(pos);
                this.accuracyCircle.setLatLng(pos);
                this.accuracyCircle.setRadius(obs.accuracy || 15);
            }
        },
        zoomIn() { if (this.map) this.map.zoomIn(); },
        zoomOut() { if (this.map) this.map.zoomOut(); }
    };

    const L3_SmartGNSS = {
        sampleTarget: 20,
        isSampling: false,

        getQuickPosition(callback) {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
                pos => {
                    callback({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: Math.round(pos.coords.accuracy)
                    });
                },
                err => console.warn(err),
                { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
            );
        },

        collectSmartObservation(progressCb, completeCb) {
            if (this.isSampling) return;
            if (!navigator.geolocation) {
                alert("Thiết bị không hỗ trợ Geolocation.");
                return;
            }

            this.isSampling = true;
            const rawSamples = [];
            const L0 = A1_State.currentProject?.meta?.centralMeridian || 105.5;

            const interval = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        const { latitude, longitude, accuracy } = pos.coords;
                        rawSamples.push({ latitude, longitude, accuracy, timestamp: Date.now() });

                        if (typeof progressCb === "function") {
                            progressCb(rawSamples.length, L3_SmartGNSS.sampleTarget);
                        }

                        if (rawSamples.length >= L3_SmartGNSS.sampleTarget) {
                            clearInterval(interval);
                            L3_SmartGNSS.isSampling = false;
                            const evaluated = L3_SmartGNSS.evaluateSamples(rawSamples, L0);
                            completeCb(evaluated);
                        }
                    },
                    err => console.warn("[GNSS Warning]", err.message),
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                );
            }, 350);
        },

        evaluateSamples(samples, L0) {
            let sumWeight = 0, sumLat = 0, sumLng = 0;
            const accuracies = samples.map(s => s.accuracy).sort((a, b) => a - b);

            samples.forEach(s => {
                const w = 1 / Math.max(s.accuracy * s.accuracy, 1);
                sumWeight += w;
                sumLat += s.latitude * w;
                sumLng += s.longitude * w;
            });

            const repLat = sumLat / sumWeight;
            const repLng = sumLng / sumWeight;
            const medianAcc = accuracies[Math.floor(accuracies.length / 2)];
            const vn2000 = VN2000Service.forward(repLat, repLng, L0);

            return {
                latitude: repLat,
                longitude: repLng,
                accuracy: Math.round(medianAcc),
                vn2000,
                provenance: {
                    source: "Smartphone GNSS (Internal)",
                    acquisitionMethod: "Smart 20-Sample Weighted Median Filter",
                    sampleCount: samples.length,
                    timestamp: Date.now()
                }
            };
        }
    };

    const L4_SurveyLineLogic = {
        async captureRoutePoint() {
            if (!A1_State.currentProject) {
                alert("Chưa chọn hồ sơ công trình.");
                return;
            }

            const btnText = document.getElementById("captureBtnText");
            L3_SmartGNSS.collectSmartObservation(
                (current, target) => { btnText.innerText = `⏳ Đang gom GNSS (${current}/${target})...`; },
                async (evaluatedObservation) => {
                    btnText.innerText = "◎ CHỐT ĐIỂM SMART GPS";
                    const pointRecord = {
                        id: Date.now().toString(),
                        lat: evaluatedObservation.latitude,
                        lng: evaluatedObservation.longitude,
                        accuracy: evaluatedObservation.accuracy,
                        vn2000: evaluatedObservation.vn2000,
                        provenance: evaluatedObservation.provenance,
                        timestamp: Date.now()
                    };

                    if (!A1_State.currentProject.points) A1_State.currentProject.points = [];
                    A1_State.currentProject.points.push(pointRecord);
                    await A4_Persistence.saveProject(A1_State.currentProject);

                    L2_MapEngine.renderRoute(A1_State.currentProject.points);
                    L2_MapEngine.updateLivePosition(evaluatedObservation);
                    L4_SurveyLineLogic.updateUI();

                    if (navigator.vibrate) navigator.vibrate(150);
                }
            );
        },

        getSummary() {
            const pts = A1_State.currentProject?.points || [];
            let length = 0;
            for (let i = 1; i < pts.length; i++) {
                const p1 = L.latLng(pts[i - 1].lat, pts[i - 1].lng);
                const p2 = L.latLng(pts[i].lat, pts[i].lng);
                length += p1.distanceTo(p2);
            }
            return {
                count: pts.length,
                totalMeters: length,
                lengthText: length >= 1000 ? `${(length / 1000).toFixed(2)} km` : `${Math.round(length)} m`
            };
        },

        updateUI() {
            const summary = this.getSummary();
            document.getElementById("pointCount").innerText = summary.count;
            document.getElementById("lineLength").innerText = summary.lengthText;

            const pts = A1_State.currentProject?.points || [];
            if (pts.length > 0) {
                const last = pts[pts.length - 1];
                document.getElementById("vn2000Text").innerText = `${last.vn2000.x.toFixed(0)}, ${last.vn2000.y.toFixed(0)}`;
                document.getElementById("gpsAccuracy").innerText = `± ${last.accuracy}m`;
                document.getElementById("gpsText").innerText = "GNSS Đã chốt vị trí";
            }
        }
    };

    /* =====================================================
       4.1 QUẢN LÝ CHIA ĐÔI MÀN HÌNH (SPLIT-SCREEN BẢN ĐỒ & CAMERA TUYẾN)
    ===================================================== */
    const L5_SplitScreenLinearManager = {
        splitWrapper: null,
        videoEl: null,
        stream: null,
        isSplitActive: false,

        initUI() {
            const badge = document.getElementById("lineMediaCountBadge");
            const count = (A1_State.currentProject?.linearMedia || []).length;
            if (badge) badge.innerText = `${count} file`;

            this.setupSplitDOM();
        },

        setupSplitDOM() {
            if (document.getElementById("linearSplitVideoPanel")) return;

            const linearScreen = document.getElementById("screenLinear");
            const mapWrapper = linearScreen.querySelector(".map-wrapper-fullscreen");

            // Tạo khung chứa nửa dưới cho Camera chia đôi màn hình
            const splitPanel = document.createElement("div");
            splitPanel.id = "linearSplitVideoPanel";
            splitPanel.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 50%;
                background: #000;
                display: none;
                flex-direction: column;
                z-index: 998;
                border-top: 3px solid #00E5FF;
                box-shadow: 0 -4px 15px rgba(0,0,0,0.5);
            `;

            splitPanel.innerHTML = `
                <div style="position:relative; width:100%; height:100%; overflow:hidden;">
                    <video id="linearSplitVideo" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover;"></video>
                    
                    <div style="position:absolute; top:8px; left:12px; background:rgba(0,0,0,0.6); color:#00E5FF; font-size:12px; font-weight:bold; padding:4px 8px; border-radius:6px;">
                        LIVE VIEW TUYẾN ỐNG
                    </div>

                    <button id="btnCloseSplitCamera" style="position:absolute; top:8px; right:12px; background:rgba(239,68,68,0.85); color:#fff; border:none; width:32px; height:32px; border-radius:50%; font-weight:bold; font-size:16px;">✕</button>

                    <div style="position:absolute; bottom:12px; left:0; width:100%; display:flex; justify-content:center; gap:20px; z-index:999;">
                        <button id="btnSplitSnapPhoto" style="background:#0284c7; color:#fff; border:none; padding:10px 18px; border-radius:30px; font-weight:bold; font-size:13px; box-shadow:0 3px 8px rgba(0,0,0,0.4);">📷 CHỤP ẢNH TUYẾN</button>
                        <button id="btnSplitRecordVideo" style="background:#ea580c; color:#fff; border:none; padding:10px 18px; border-radius:30px; font-weight:bold; font-size:13px; box-shadow:0 3px 8px rgba(0,0,0,0.4);">🔴 QUAY VIDEO (≤60s)</button>
                    </div>
                </div>
            `;

            linearScreen.appendChild(splitPanel);
            this.splitWrapper = splitPanel;
            this.videoEl = document.getElementById("linearSplitVideo");

            // Bắt sự kiện trong Panel chia đôi
            document.getElementById("btnCloseSplitCamera").onclick = () => this.toggleSplit(false);
            document.getElementById("btnSplitSnapPhoto").onclick = () => this.capturePhotoFromStream();
            document.getElementById("btnSplitRecordVideo").onclick = () => this.recordVideoFromStream();
        },

        async toggleSplit(enable) {
            const linearScreen = document.getElementById("screenLinear");
            const mapWrapper = linearScreen.querySelector(".map-wrapper-fullscreen");

            if (enable) {
                try {
                    if (this.stream) this.stopStream();
                    this.stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
                        audio: true
                    });
                    this.videoEl.srcObject = this.stream;
                    this.splitWrapper.style.display = "flex";
                    mapWrapper.style.height = "50%";
                    this.isSplitActive = true;
                    setTimeout(() => L2_MapEngine.invalidate(), 200);
                } catch (e) {
                    // Nếu thiết bị không mở được luồng trực tiếp, kích hoạt input mặc định
                    document.getElementById("inputLinePhoto").click();
                }
            } else {
                this.stopStream();
                this.splitWrapper.style.display = "none";
                mapWrapper.style.height = "100%";
                this.isSplitActive = false;
                setTimeout(() => L2_MapEngine.invalidate(), 200);
            }
        },

        stopStream() {
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
                this.stream = null;
            }
            if (this.videoEl) this.videoEl.srcObject = null;
        },

        capturePhotoFromStream() {
            if (!this.stream) return;
            const canvas = document.createElement("canvas");
            canvas.width = this.videoEl.videoWidth || 1280;
            canvas.height = this.videoEl.videoHeight || 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);

            const pts = A1_State.currentProject?.points || [];
            const last = pts.length > 0 ? pts[pts.length - 1] : null;
            const timeStr = new Date().toLocaleTimeString("vi-VN");
            const coordStr = last ? `VN2000: X:${last.vn2000.x} Y:${last.vn2000.y}` : "TGS GNSS LIVE";

            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
            ctx.fillStyle = "#00E5FF";
            ctx.font = "bold 18px Arial";
            ctx.fillText(`TUYẾN ỐNG | ${timeStr} | ${coordStr}`, 20, canvas.height - 15);

            const base64 = canvas.toDataURL("image/jpeg", 0.85);
            this.saveLinearMediaItem({
                type: "photo",
                data: base64,
                timestamp: Date.now(),
                label: `Ảnh tuyến ${pts.length > 0 ? `tại điểm #${pts.length}` : ""}`
            });

            if (navigator.vibrate) navigator.vibrate(100);
            alert("✓ Đã chụp và lưu ảnh hiện trường tuyến thành công!");
        },

        recordVideoFromStream() {
            if (!this.stream) return;
            const recBtn = document.getElementById("btnSplitRecordVideo");
            
            if (recBtn.getAttribute("data-recording") === "true") {
                if (this.mediaRec && this.mediaRec.state === "recording") {
                    this.mediaRec.stop();
                }
                return;
            }

            const chunks = [];
            try {
                this.mediaRec = new MediaRecorder(this.stream);
            } catch (e) {
                alert("Thiết bị không hỗ trợ MediaRecorder.");
                return;
            }

            this.mediaRec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            this.mediaRec.onstop = () => {
                const blob = new Blob(chunks, { type: "video/mp4" });
                this.saveLinearMediaItem({
                    type: "video",
                    blob: blob,
                    timestamp: Date.now(),
                    label: "Video thuyết minh hiện trạng tuyến"
                });
                recBtn.innerText = "🔴 QUAY VIDEO (≤60s)";
                recBtn.style.background = "#ea580c";
                recBtn.removeAttribute("data-recording");
                alert("✓ Đã lưu video hiện trường tuyến ống!");
            };

            this.mediaRec.start();
            recBtn.innerText = "⏹ DỪNG QUAY (ĐANG REC...)";
            recBtn.style.background = "#dc2626";
            recBtn.setAttribute("data-recording", "true");

            // Tự ngắt sau 60 giây để tránh file quá nặng
            setTimeout(() => {
                if (this.mediaRec && this.mediaRec.state === "recording") {
                    this.mediaRec.stop();
                }
            }, 60000);
        },

        async saveLinearMediaItem(mediaItem) {
            if (!A1_State.currentProject.linearMedia) A1_State.currentProject.linearMedia = [];
            A1_State.currentProject.linearMedia.push(mediaItem);
            await A4_Persistence.saveProject(A1_State.currentProject);

            const badge = document.getElementById("lineMediaCountBadge");
            if (badge) badge.innerText = `${A1_State.currentProject.linearMedia.length} file`;
        }
    };

    /* =====================================================
       5. MODULE CAMERA KHẢO SÁT HẠNG MỤC / TRẠM
    ===================================================== */
    const P3_CameraSession = {
        videoInline: document.getElementById("cameraPreview"),
        videoFS: document.getElementById("cameraPreviewFS"),
        stream: null,
        mediaRecorder: null,
        recordedChunks: [],
        recordingTimer: null,
        recordedSeconds: 0,
        isRecording: false,
        videoTrack: null,

        async startCamera() {
            try {
                if (this.stream) this.stopCamera();
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: true
                });
                
                this.videoInline.srcObject = this.stream;
                this.videoFS.srcObject = this.stream;
                this.videoTrack = this.stream.getVideoTracks()[0];
                document.getElementById("btnToggleCamera").innerText = "Đóng Camera";
            } catch (err) {
                alert("Không thể khởi động Camera: " + err.message);
            }
        },

        stopCamera() {
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
                this.stream = null;
                this.videoTrack = null;
            }
            if (this.videoInline) this.videoInline.srcObject = null;
            if (this.videoFS) this.videoFS.srcObject = null;
            document.getElementById("btnToggleCamera").innerText = "Mở Camera";
        },

        toggleRecord(onVideoCompleted) {
            if (!this.stream) {
                alert("Vui lòng mở Camera trước.");
                return;
            }

            const recBtnInline = document.getElementById("btnRecordVideo");
            const recBtnFS = document.getElementById("btnRecordVideoFS");
            const fsBadge = document.getElementById("fsRecBadge");

            if (!this.isRecording) {
                this.recordedChunks = [];
                
                const mimeType = MediaRecorder.isTypeSupported("video/mp4") 
                    ? "video/mp4" 
                    : (MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm");

                const recorderOptions = {
                    mimeType: mimeType,
                    videoBitsPerSecond: 2500000
                };

                try {
                    this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
                } catch (e) {
                    this.mediaRecorder = new MediaRecorder(this.stream);
                }

                this.mediaRecorder.ondataavailable = e => {
                    if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
                };

                this.mediaRecorder.onstop = () => {
                    const videoBlob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType || "video/mp4" });
                    if (typeof onVideoCompleted === "function") {
                        onVideoCompleted(videoBlob);
                    }
                };

                this.mediaRecorder.start(2000);
                this.isRecording = true;
                this.recordedSeconds = 0;
                
                recBtnInline.innerText = "⏹ Dừng REC";
                recBtnFS.classList.add("recording");
                fsBadge.classList.add("recording");

                this.recordingTimer = setInterval(() => {
                    this.recordedSeconds++;
                    const m = Math.floor(this.recordedSeconds / 60).toString().padStart(2, "0");
                    const s = (this.recordedSeconds % 60).toString().padStart(2, "0");
                    fsBadge.innerText = `🔴 REC ${m}:${s}`;
                }, 1000);
            } else {
                this.mediaRecorder.stop();
                this.isRecording = false;
                clearInterval(this.recordingTimer);
                
                recBtnInline.innerText = "🔴 Quay Video";
                recBtnFS.classList.remove("recording");
                fsBadge.classList.remove("recording");
                fsBadge.innerText = "⚪ ĐÃ LƯU VIDEO";
            }
        },

        takeSnapshot(overlayText = "") {
            if (!this.stream) {
                alert("Chưa mở Camera.");
                return null;
            }

            const canvas = document.createElement("canvas");
            const videoEl = this.videoFS.videoWidth ? this.videoFS : this.videoInline;
            canvas.width = videoEl.videoWidth || 1280;
            canvas.height = videoEl.videoHeight || 720;
            const ctx = canvas.getContext("2d");

            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
            ctx.fillStyle = "#00E5FF";
            ctx.font = "bold 20px Arial";
            ctx.fillText(overlayText, 20, canvas.height - 18);

            return canvas.toDataURL("image/jpeg", 0.85);
        }
    };

    const P4_MediaManager = {
        timelineEl: document.getElementById("cameraTimeline"),
        currentPhotos: [],
        currentVideoBlob: null,

        resetMediaSession() {
            this.currentPhotos = [];
            this.currentVideoBlob = null;
            this.renderTimeline();
            document.getElementById("videoRecordedNotice").classList.add("hidden");
        },

        addPhoto(base64Data, label) {
            this.currentPhotos.unshift({
                id: Date.now().toString(),
                label,
                image: base64Data,
                timestamp: Date.now()
            });
            this.renderTimeline();
        },

        setVideoBlob(blob) {
            this.currentVideoBlob = blob;
            document.getElementById("videoRecordedNotice").classList.remove("hidden");
        },

        renderTimeline() {
            this.timelineEl.innerHTML = "";
            document.getElementById("photoCount").innerText = this.currentPhotos.length;

            if (this.currentPhotos.length === 0) {
                this.timelineEl.innerHTML = "<p style='color:var(--muted); font-size:12px; grid-column:1/-1; text-align:center;'>Chưa có ảnh</p>";
                return;
            }

            this.currentPhotos.forEach(p => {
                const div = document.createElement("div");
                div.className = "timeline-photo";
                div.innerHTML = `<img src="${p.image}"><small>${p.label}</small>`;
                this.timelineEl.appendChild(div);
            });
        }
    };

    const P2_PointGNSS = {
        observedPoint: null,

        observePointPosition(onComplete) {
            const btnText = document.getElementById("btnPointGPSText");
            L3_SmartGNSS.collectSmartObservation(
                (current, target) => { btnText.innerText = `⏳ Đang gom GNSS (${current}/${target})...`; },
                (evaluated) => {
                    btnText.innerText = "◎ Thu nhận Smart GNSS vị trí";
                    P2_PointGNSS.observedPoint = evaluated;

                    document.getElementById("pointWGS84Text").innerText = `${evaluated.latitude.toFixed(6)}, ${evaluated.longitude.toFixed(6)}`;
                    document.getElementById("pointVN2000Text").innerText = `X:${evaluated.vn2000.x} | Y:${evaluated.vn2000.y}`;
                    document.getElementById("pointAccuracyText").innerText = `± ${evaluated.accuracy} m (Smart 20/20)`;

                    if (typeof onComplete === "function") onComplete(evaluated);
                }
            );
        },

        reset() {
            this.observedPoint = null;
            document.getElementById("pointWGS84Text").innerText = "Chưa thu nhận";
            document.getElementById("pointVN2000Text").innerText = "Chưa chuyển";
            document.getElementById("pointAccuracyText").innerText = "± -- m";
        }
    };

    const P1_StationWorkflow = {
        initUI() {
            if (!A1_State.currentProject) return;

            document.getElementById("pointProjectTitle").innerText = A1_State.currentProject.name;
            document.getElementById("pointProjectSubtitle").innerText = 
                `Mã: ${A1_State.currentProject.code} · ${A1_State.currentProject.location || "Chưa có địa điểm"}`;

            P2_PointGNSS.reset();
            P4_MediaManager.resetMediaSession();

            const typeSelect = document.getElementById("pointTypeSelect");
            const groupSection = document.getElementById("sectionCategoryGroup");
            const sectionSelect = document.getElementById("sectionSelect");
            const customInput = document.getElementById("pointCustomSectionInput");

            typeSelect.value = "Trạm cấp nước";
            groupSection.classList.add("hidden");
            customInput.classList.add("hidden");
            customInput.value = "";
            document.getElementById("pointNoteInput").value = "";

            typeSelect.onchange = () => {
                if (typeSelect.value === "Hạng mục") groupSection.classList.remove("hidden");
                else groupSection.classList.add("hidden");
            };

            sectionSelect.onchange = () => {
                if (sectionSelect.value === "KHAC") {
                    customInput.classList.remove("hidden");
                    customInput.focus();
                } else {
                    customInput.classList.add("hidden");
                }
            };

            this.renderList();
        },

        async saveStationRecord() {
            const type = document.getElementById("pointTypeSelect").value;
            let sectionName = "";
            let note = "";

            if (type === "Trạm cấp nước") {
                sectionName = "Toàn trạm (Theo Video thuyết minh)";
                note = document.getElementById("pointNoteInput").value.trim();
            } else {
                const sectionSelectVal = document.getElementById("sectionSelect").value;
                if (sectionSelectVal === "KHAC") {
                    sectionName = document.getElementById("pointCustomSectionInput").value.trim();
                    if (!sectionName) {
                        alert("Vui lòng nhập tên hạng mục cụ thể.");
                        return;
                    }
                } else {
                    sectionName = sectionSelectVal;
                }
                note = document.getElementById("pointNoteInput").value.trim();
            }

            if (!P2_PointGNSS.observedPoint) {
                alert("Vui lòng bấm 'Thu nhận Smart GNSS vị trí' trước khi lưu.");
                return;
            }

            const stationEntity = {
                id: Date.now().toString(),
                type,
                name: A1_State.currentProject.name,
                section: sectionName,
                note: note,
                coordinates: {
                    lat: P2_PointGNSS.observedPoint.latitude,
                    lng: P2_PointGNSS.observedPoint.longitude,
                    accuracy: P2_PointGNSS.observedPoint.accuracy,
                    vn2000: P2_PointGNSS.observedPoint.vn2000
                },
                provenance: P2_PointGNSS.observedPoint.provenance,
                evidence: {
                    photos: [...P4_MediaManager.currentPhotos],
                    videoBlob: P4_MediaManager.currentVideoBlob
                },
                createdAt: Date.now()
            };

            if (!A1_State.currentProject.pointFeatures) A1_State.currentProject.pointFeatures = [];
            A1_State.currentProject.pointFeatures.push(stationEntity);

            await A4_Persistence.saveProject(A1_State.currentProject);

            P3_CameraSession.stopCamera();
            P4_MediaManager.resetMediaSession();
            P2_PointGNSS.reset();

            document.getElementById("pointCustomSectionInput").value = "";
            document.getElementById("pointNoteInput").value = "";

            this.renderList();
            alert("Đã lưu hồ sơ đối tượng & media an toàn!");
        },

        getSummary() {
            const items = A1_State.currentProject?.pointFeatures || [];
            return { count: items.length };
        },

        renderList() {
            const listEl = document.getElementById("savedPointsList");
            const countEl = document.getElementById("savedPointsCount");
            const items = A1_State.currentProject?.pointFeatures || [];

            countEl.innerText = items.length;
            listEl.innerHTML = "";

            if (items.length === 0) {
                listEl.innerHTML = "<p style='color:var(--muted); font-size:13px;'>Chưa có đối tượng nào được lưu.</p>";
                return;
            }

            items.forEach((it, idx) => {
                const photoCount = it.evidence?.photos?.length || 0;
                const hasVideo = it.evidence?.videoBlob ? "🎥" : "";
                const div = document.createElement("div");
                div.className = "saved-point-item";
                div.innerHTML = `
                    <div>
                        <strong>${idx + 1}. [${it.type}] ${it.section}</strong>
                        <span>VN2000: X:${it.coordinates.vn2000.x} | Y:${it.coordinates.vn2000.y} · 📷 ${photoCount} ảnh ${hasVideo}</span>
                    </div>
                    <span style="color:var(--primary); font-weight:700;">✓</span>
                `;
                listEl.appendChild(div);
            });
        }
    };

    /* =====================================================
       5.1 MODULE HẬU KIỂM & XEM LẠI MEDIA (SCREEN 07)
    ===================================================== */
    const R1_ReviewMediaManager = {
        container: document.getElementById("reviewMediaContainer"),
        titleEl: document.getElementById("reviewProjectName"),

        openReview() {
            if (!A1_State.currentProject) {
                alert("Chưa chọn hồ sơ công trình.");
                return;
            }

            if (this.titleEl) {
                this.titleEl.innerText = `${A1_State.currentProject.name} (${A1_State.currentProject.code})`;
            }

            this.renderMediaContent();
            A2_Navigation.show("reviewMedia");
        },

        renderMediaContent() {
            if (!this.container) return;
            this.container.innerHTML = "";

            const proj = A1_State.currentProject;
            const items = proj.pointFeatures || [];
            const linearMedia = proj.linearMedia || [];

            let allPhotos = [];
            let allVideos = [];

            // Bổ sung media từ khảo sát tuyến ống
            linearMedia.forEach((lm, lIdx) => {
                if (lm.type === "photo") {
                    allPhotos.push({
                        image: lm.data,
                        section: "Tuyến ống chính",
                        label: lm.label || `Ảnh tuyến #${lIdx + 1}`
                    });
                } else if (lm.type === "video" && lm.blob) {
                    allVideos.push({
                        blob: lm.blob,
                        section: "Tuyến ống chính",
                        type: "Khảo sát tuyến"
                    });
                }
            });

            // Gom media từ khảo sát điểm / trạm
            items.forEach((it, idx) => {
                const photos = it.evidence?.photos || [];
                photos.forEach(p => {
                    allPhotos.push({
                        ...p,
                        section: it.section,
                        type: it.type,
                        itemIndex: idx + 1
                    });
                });

                if (it.evidence?.videoBlob) {
                    allVideos.push({
                        blob: it.evidence.videoBlob,
                        section: it.section,
                        type: it.type,
                        itemIndex: idx + 1
                    });
                }
            });

            if (allPhotos.length === 0 && allVideos.length === 0) {
                this.container.innerHTML = `
                    <div style="text-align:center; padding:40px 16px; color:#64748B;">
                        <div style="font-size:36px; margin-bottom:8px;">📷</div>
                        <p>Chưa có hình ảnh hoặc video nào được ghi nhận cho công trình này.</p>
                    </div>
                `;
                return;
            }

            let html = "";

            if (allVideos.length > 0) {
                html += `
                    <div style="margin-bottom:24px;">
                        <h3 style="font-size:16px; color:#1E293B; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                            🎥 Video thuyết minh hiện trường (${allVideos.length})
                        </h3>
                        <div style="display:flex; flex-direction:column; gap:14px;">
                `;

                allVideos.forEach((v, vIdx) => {
                    const videoUrl = URL.createObjectURL(v.blob);
                    const sizeMb = (v.blob.size / 1024 / 1024).toFixed(1);
                    html += `
                        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px; overflow:hidden;">
                            <strong style="font-size:14px; color:#0F172A; display:block; margin-bottom:6px;">
                                Video ${vIdx + 1}: [${v.type || 'Trạm'}] ${v.section} (${sizeMb} MB)
                            </strong>
                            <video src="${videoUrl}" controls playsinline style="width:100%; max-height:240px; border-radius:8px; background:#000;"></video>
                        </div>
                    `;
                });

                html += `</div></div>`;
            }

            if (allPhotos.length > 0) {
                html += `
                    <div>
                        <h3 style="font-size:16px; color:#1E293B; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                            📷 Album ảnh hiện trường có tọa độ (${allPhotos.length})
                        </h3>
                        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
                `;

                allPhotos.forEach(p => {
                    html += `
                        <div style="background:#FFF; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; display:flex; flex-direction:column;">
                            <img src="${p.image}" style="width:100%; height:110px; object-fit:cover; display:block;" onclick="window.open('${p.image}')">
                            <div style="padding:6px 8px; font-size:11px; color:#475569; background:#F8FAFC;">
                                <strong style="display:block; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.section}</strong>
                                <span>${p.label || ""}</span>
                            </div>
                        </div>
                    `;
                });

                html += `</div></div>`;
            }

            this.container.innerHTML = html;
        }
    };

    /* =====================================================
       5.2 MODULE XUẤT DỮ LIỆU & TẢI FILE DỰ PHÒNG (SCREEN 08)
    ===================================================== */
    const Z3_ExportManager = {
        exportJSON() {
            const proj = A1_State.currentProject;
            if (!proj) {
                alert("Chưa chọn công trình.");
                return;
            }

            const stations = proj.pointFeatures || [];
            const cleanStations = stations.map(st => ({
                id: st.id,
                type: st.type,
                name: st.name,
                section: st.section,
                note: st.note,
                coordinates: st.coordinates,
                provenance: st.provenance,
                evidence: {
                    photoCount: st.evidence?.photos?.length || 0,
                    hasVideo: Boolean(st.evidence?.videoBlob)
                }
            }));

            const dataset = {
                contract: "TGS-HO-301 REV02",
                platform: "TGS Platform Genesis 2.0",
                exportedAt: new Date().toISOString(),
                surveyor: A0_AuthManager.currentUser?.name || "Kỹ thuật viên",
                project: proj,
                linearSurvey: {
                    lineSummary: L4_SurveyLineLogic.getSummary(),
                    points: proj.points || [],
                    linearMediaCount: (proj.linearMedia || []).length
                },
                pointSurvey: {
                    stationCount: cleanStations.length,
                    features: cleanStations
                }
            };

            const jsonStr = JSON.stringify(dataset, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const fileName = `DATASET_${proj.code}_${new Date().toISOString().slice(0, 10)}.json`;

            this.triggerDownload(blob, fileName);
            alert(`Đã xuất tập dữ liệu JSON: ${fileName}`);
        },

        exportPhotos() {
            const proj = A1_State.currentProject;
            if (!proj) {
                alert("Chưa chọn công trình.");
                return;
            }

            let photoList = [];

            (proj.linearMedia || []).forEach((lm, idx) => {
                if (lm.type === "photo") {
                    photoList.push({
                        image: lm.data,
                        fileName: `ANH_${proj.code}_TuyenOng_${idx + 1}.jpg`
                    });
                }
            });

            const stations = proj.pointFeatures || [];
            stations.forEach(st => {
                const photos = st.evidence?.photos || [];
                photos.forEach((p, pIdx) => {
                    photoList.push({
                        image: p.image,
                        fileName: `ANH_${proj.code}_${(st.section || "HM").replace(/[^a-zA-Z0-9]/g, "_")}_${pIdx + 1}.jpg`
                    });
                });
            });

            if (photoList.length === 0) {
                alert("Công trình này hiện chưa có ảnh nào để tải.");
                return;
            }

            photoList.forEach((item, index) => {
                setTimeout(() => {
                    const a = document.createElement("a");
                    a.href = item.image;
                    a.download = item.fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }, index * 250);
            });

            alert(`Đang bắt đầu tải ${photoList.length} ảnh hiện trường về máy của bạn!`);
        },

        exportVideos() {
            const proj = A1_State.currentProject;
            if (!proj) {
                alert("Chưa chọn công trình.");
                return;
            }

            let videoList = [];

            (proj.linearMedia || []).forEach((lm, idx) => {
                if (lm.type === "video" && lm.blob instanceof Blob) {
                    videoList.push({
                        blob: lm.blob,
                        fileName: `VIDEO_${proj.code}_TuyenOng_${idx + 1}.mp4`
                    });
                }
            });

            const stations = proj.pointFeatures || [];
            stations.forEach(st => {
                if (st.evidence?.videoBlob instanceof Blob) {
                    videoList.push({
                        blob: st.evidence.videoBlob,
                        fileName: `VIDEO_${proj.code}_${(st.section || "ToanTram").replace(/[^a-zA-Z0-9]/g, "_")}.mp4`
                    });
                }
            });

            if (videoList.length === 0) {
                alert("Công trình này hiện chưa có video nào được quay.");
                return;
            }

            videoList.forEach((item, index) => {
                setTimeout(() => {
                    this.triggerDownload(item.blob, item.fileName);
                }, index * 300);
            });

            alert(`Đang tải ${videoList.length} video hiện trường về máy!`);
        },

        triggerDownload(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    };

    /* =====================================================
       6. ĐỒNG BỘ 2 PHA KÈM CƠ CHẾ DỰ PHÒNG OFFLINE (KHÔNG BỊ KẸT FETCH)
    ===================================================== */
    const Z2_SyncEngine = {
        async executeSync() {
            if (!A1_State.currentProject) {
                alert("Không có hồ sơ công trình hiện hành.");
                return;
            }

            const btnSync = document.getElementById("btnSyncDrive");
            const statusEl = document.getElementById("driveSyncStatus");
            const proj = A1_State.currentProject;
            const stations = proj.pointFeatures || [];

            statusEl.classList.remove("hidden");
            statusEl.style.color = "#E65100";
            btnSync.disabled = true;

            const mode = A0_AuthManager.getStorageTarget();
            const targetUrl = A0_AuthManager.getWebhookUrl();

            try {
                statusEl.innerText = "⏳ Đang chuẩn bị gói dữ liệu khảo sát...";
                const photosPayload = [];
                const videoQueue = [];

                // Tuyến Media
                (proj.linearMedia || []).forEach((lm, idx) => {
                    if (lm.type === "photo") {
                        photosPayload.push({
                            fileName: `ANH_${proj.code}_Tuyen_${idx + 1}.jpg`,
                            data: lm.data
                        });
                    } else if (lm.type === "video" && lm.blob instanceof Blob) {
                        videoQueue.push({ blob: lm.blob, section: `Tuyen_${idx + 1}` });
                    }
                });

                // Trạm Media
                for (let sIdx = 0; sIdx < stations.length; sIdx++) {
                    const st = stations[sIdx];
                    const photos = st.evidence?.photos || [];
                    for (let pIdx = 0; pIdx < photos.length; pIdx++) {
                        photosPayload.push({
                            fileName: `ANH_${proj.code}_${(st.section || 'HM').replace(/[^a-zA-Z0-9]/g, '_')}_${pIdx + 1}.jpg`,
                            data: photos[pIdx].image
                        });
                    }
                    if (st.evidence?.videoBlob instanceof Blob) {
                        videoQueue.push({
                            blob: st.evidence.videoBlob,
                            section: st.section || "ToanTram"
                        });
                    }
                }

                const cleanStations = stations.map(st => ({
                    id: st.id,
                    type: st.type,
                    name: st.name,
                    section: st.section,
                    note: st.note,
                    coordinates: st.coordinates,
                    provenance: st.provenance,
                    evidence: {
                        photoCount: st.evidence?.photos?.length || 0,
                        hasVideo: Boolean(st.evidence?.videoBlob)
                    }
                }));

                const dataset = {
                    contract: "TGS-HO-301 REV02",
                    platform: "TGS Platform Genesis 2.0",
                    exportedAt: new Date().toISOString(),
                    surveyor: A0_AuthManager.currentUser?.name || "Kỹ thuật viên",
                    project: proj,
                    linearSurvey: {
                        lineSummary: L4_SurveyLineLogic.getSummary(),
                        points: proj.points || [],
                        linearMediaCount: (proj.linearMedia || []).length
                    },
                    pointSurvey: {
                        stationCount: cleanStations.length,
                        features: cleanStations
                    }
                };

                statusEl.innerText = "☁️ Đang đồng bộ số liệu & ảnh tĩnh...";
                const syncApiUrl = mode === "server" ? `${targetUrl}/api/sync-data` : targetUrl;
                
                const resP1 = await fetch(syncApiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-TGS-Key": CONFIG.TGS_API_KEY
                    },
                    body: JSON.stringify({
                        project: { name: proj.name, code: proj.code },
                        dataset: dataset,
                        photos: photosPayload
                    })
                });

                if (!resP1.ok) throw new Error(`Lỗi kết nối Pha 1 (Mã HTTP ${resP1.status})`);

                // Pha 2 video
                if (videoQueue.length > 0 && mode === "server") {
                    for (let vIdx = 0; vIdx < videoQueue.length; vIdx++) {
                        const item = videoQueue[vIdx];
                        const mbSize = (item.blob.size / 1024 / 1024).toFixed(1);
                        statusEl.innerText = `🎥 Đang tải Video ${vIdx + 1}/${videoQueue.length} (${mbSize} MB)...`;

                        const formData = new FormData();
                        const vFileName = `VIDEO_${proj.code}_${item.section.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
                        formData.append("projectCode", proj.code);
                        formData.append("videoFile", item.blob, vFileName);

                        await fetch(`${targetUrl}/api/upload-video`, {
                            method: "POST",
                            headers: { "X-TGS-Key": CONFIG.TGS_API_KEY },
                            body: formData
                        });
                    }
                }

                // Đánh dấu hoàn thành
                proj.status = "completed";
                proj.updatedAt = Date.now();
                await A4_Persistence.saveProject(proj);

                statusEl.style.color = "#2E7D32";
                statusEl.innerHTML = `✓ Đồng bộ thành công toàn bộ hồ sơ & Media!`;
                alert("Đã đồng bộ hồ sơ và khóa công trình thành công!");

            } catch (err) {
                statusEl.style.color = "#D32F2F";
                statusEl.innerText = "✕ Lỗi mạng / Không kết nối máy chủ: " + err.message;

                // CƠ CHẾ DỰ PHÒNG: CHO PHÉP ĐÓNG HỒ SƠ NGOẠI TUYẾN
                const markOffline = confirm(
                    `Không thể kết nối đến máy chủ (${err.message}).\n\n` +
                    `Dữ liệu vẫn được an toàn 100% trong bộ nhớ máy.\n` +
                    `Bạn có muốn ĐÓNG HỒ SƠ & HOÀN THÀNH NGOẠI TUYẾN để không bị nhắc dở dang không?\n` +
                    `(Sau này có mạng vẫn có thể bấm Đồng bộ lại hoặc Xuất JSON/Zalo).`
                );

                if (markOffline) {
                    proj.status = "completed";
                    proj.updatedAt = Date.now();
                    await A4_Persistence.saveProject(proj);
                    statusEl.style.color = "#1565C0";
                    statusEl.innerText = "✓ Đã lưu trữ và khóa công trình an toàn trên thiết bị!";
                    alert("Đã kết thúc khảo sát ngoại tuyến thành công!");
                }
            } finally {
                btnSync.disabled = false;
            }
        }
    };

    /* =====================================================
       7. KHỞI CHẠY HỆ THỐNG & SỰ KIỆN GIAO DIỆN
    ===================================================== */
    const Z1_AppInitialize = {
        bindGlobalEvents() {
            document.getElementById("btnStart").addEventListener("click", () => A2_Navigation.show("projectHome"));

            document.getElementById("btnContinueDraft").addEventListener("click", () => {
                if (A1_State.currentProject) A3_ProjectLifecycle.enterSurveyHome();
            });

            document.getElementById("btnNewProject").addEventListener("click", async () => {
                document.getElementById("projectName").value = "";
                document.getElementById("projectLocation").value = "";
                const nextCode = await A3_ProjectLifecycle.generateNextProjectCode();
                document.getElementById("projectCode").value = nextCode;
                A2_Navigation.show("project");
            });

            const btnOpenProj = document.getElementById("btnOpenProject");
            if (btnOpenProj) btnOpenProj.addEventListener("click", () => A3_ProjectListManager.openModal());

            const btnCloseList = document.getElementById("btnCloseProjectList");
            if (btnCloseList) btnCloseList.addEventListener("click", () => A3_ProjectListManager.closeModal());

            const searchInput = document.getElementById("searchProjectInput");
            if (searchInput) {
                searchInput.addEventListener("input", (e) => {
                    A3_ProjectListManager.renderProjects(e.target.value.trim());
                });
            }

            document.getElementById("btnCreateProject").addEventListener("click", () => A3_ProjectLifecycle.createNewProject());
            document.getElementById("btnBackHome").addEventListener("click", () => A2_Navigation.show("projectHome"));
            document.getElementById("btnBackProject").addEventListener("click", async () => {
                await A3_ProjectLifecycle.verifyDraft();
                A2_Navigation.show("projectHome");
            });

            document.getElementById("btnLinearSurvey").addEventListener("click", () => L1_ResumeManager.resumeLinearSession());
            document.getElementById("btnPointSurvey").addEventListener("click", () => {
                if (A1_State.currentProject) {
                    A1_State.currentProject.surveyType = "point";
                    A4_Persistence.saveProject(A1_State.currentProject);
                    P1_StationWorkflow.initUI();
                }
                A2_Navigation.show("point");
            });

            const btnReview = document.getElementById("btnReviewMedia");
            if (btnReview) btnReview.addEventListener("click", () => R1_ReviewMediaManager.openReview());

            const btnBackReview = document.getElementById("btnBackFromReview");
            if (btnBackReview) btnBackReview.addEventListener("click", () => A2_Navigation.show("surveyHome"));

            document.getElementById("btnFinishProject").addEventListener("click", () => A3_ProjectLifecycle.openCompleteSummary());
            document.getElementById("btnBackFromComplete").addEventListener("click", () => A3_ProjectLifecycle.enterSurveyHome());
            document.getElementById("btnExitLinear").addEventListener("click", () => {
                L5_SplitScreenLinearManager.toggleSplit(false);
                A3_ProjectLifecycle.enterSurveyHome();
            });
            document.getElementById("btnExitPoint").addEventListener("click", () => A3_ProjectLifecycle.enterSurveyHome());

            // Bản đồ GIS
            document.getElementById("btnZoomIn").addEventListener("click", () => L2_MapEngine.zoomIn());
            document.getElementById("btnZoomOut").addEventListener("click", () => L2_MapEngine.zoomOut());
            document.getElementById("btnLocate").addEventListener("click", () => {
                L3_SmartGNSS.getQuickPosition(pos => L2_MapEngine.updateLivePosition(pos));
            });
            document.getElementById("btnCaptureGPS").addEventListener("click", () => L4_SurveyLineLogic.captureRoutePoint());

            // SỰ KIỆN MỚI: CHIA ĐÔI MÀN HÌNH & MEDIA TUYẾN ỐNG
            const btnLineSnap = document.getElementById("btnLineSnapPhoto");
            if (btnLineSnap) {
                btnLineSnap.addEventListener("click", () => {
                    if (L5_SplitScreenLinearManager.isSplitActive) {
                        L5_SplitScreenLinearManager.capturePhotoFromStream();
                    } else {
                        L5_SplitScreenLinearManager.toggleSplit(true);
                    }
                });
            }

            const btnLineRec = document.getElementById("btnLineRecordVideo");
            if (btnLineRec) {
                btnLineRec.addEventListener("click", () => {
                    if (L5_SplitScreenLinearManager.isSplitActive) {
                        L5_SplitScreenLinearManager.recordVideoFromStream();
                    } else {
                        L5_SplitScreenLinearManager.toggleSplit(true);
                    }
                });
            }

            // Input nạp file ngoài luồng stream (nếu dùng camera mặc định của điện thoại)
            const inputPhoto = document.getElementById("inputLinePhoto");
            if (inputPhoto) {
                inputPhoto.addEventListener("change", (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        L5_SplitScreenLinearManager.saveLinearMediaItem({
                            type: "photo",
                            data: re.target.result,
                            timestamp: Date.now(),
                            label: "Ảnh tuyến ống"
                        });
                        alert("✓ Đã lưu ảnh tuyến thành công!");
                    };
                    reader.readAsDataURL(file);
                });
            }

            const inputVideo = document.getElementById("inputLineVideo");
            if (inputVideo) {
                inputVideo.addEventListener("change", (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    L5_SplitScreenLinearManager.saveLinearMediaItem({
                        type: "video",
                        blob: file,
                        timestamp: Date.now(),
                        label: "Video tuyến ống"
                    });
                    alert("✓ Đã lưu video tuyến ống!");
                });
            }

            // Điểm khảo sát & Camera
            document.getElementById("btnGetPointGPS").addEventListener("click", () => P2_PointGNSS.observePointPosition());
            document.getElementById("btnSavePointItem").addEventListener("click", () => P1_StationWorkflow.saveStationRecord());
            document.getElementById("btnToggleCamera").addEventListener("click", () => {
                if (P3_CameraSession.stream) P3_CameraSession.stopCamera();
                else P3_CameraSession.startCamera();
            });

            document.getElementById("btnRecordVideo").addEventListener("click", () => {
                P3_CameraSession.toggleRecord(videoBlob => P4_MediaManager.setVideoBlob(videoBlob));
            });

            document.getElementById("btnSnapPhoto").addEventListener("click", () => {
                const timeStr = new Date().toLocaleTimeString("vi-VN");
                const overlay = P2_PointGNSS.observedPoint
                    ? `TGS | ${timeStr} | VN2000: X:${P2_PointGNSS.observedPoint.vn2000.x} Y:${P2_PointGNSS.observedPoint.vn2000.y}`
                    : `TGS | ${timeStr} | WGS84 Live`;
                const snap = P3_CameraSession.takeSnapshot(overlay);
                if (snap) P4_MediaManager.addPhoto(snap, timeStr);
            });

            // Đồng bộ & Xuất file
            const btnSync = document.getElementById("btnSyncDrive");
            if (btnSync) btnSync.addEventListener("click", () => Z2_SyncEngine.executeSync());

            const btnExpJSON = document.getElementById("btnExportJSON");
            if (btnExpJSON) btnExpJSON.addEventListener("click", () => Z3_ExportManager.exportJSON());

            const btnExpPhotos = document.getElementById("btnSharePhotos");
            if (btnExpPhotos) btnExpPhotos.addEventListener("click", () => Z3_ExportManager.exportPhotos());

            const btnExpVideos = document.getElementById("btnShareVideos");
            if (btnExpVideos) btnExpVideos.addEventListener("click", () => Z3_ExportManager.exportVideos());
        },

        async startup() {
            if (!A0_AuthManager.checkAuth()) {
                const inputPin = prompt("HỆ THỐNG KHẢO SÁT TGS\nVui lòng nhập Mã PIN kích hoạt thiết bị:");
                if (!A0_AuthManager.verifyPin(inputPin)) {
                    alert("Mã PIN không hợp lệ. Bạn không có quyền truy cập hệ thống.");
                    document.body.innerHTML = "<div style='text-align:center; margin-top:20vh; font-family:sans-serif;'><h2>Truy cập bị từ chối</h2><p>Vui lòng liên hệ Người quản trị để nhận mã kích hoạt thiết bị.</p></div>";
                    return;
                }
            }

            this.bindGlobalEvents();
            try {
                await A4_Persistence.init();
                await A3_ProjectLifecycle.verifyDraft();
            } catch (err) {
                console.error("Lỗi khởi tạo:", err);
            }
        }
    };

    return { initialize: () => Z1_AppInitialize.startup() };
})();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TGS.initialize);
} else {
    TGS.initialize();
}
/* =========================================================================
   MODULE KÍCH HOẠT NÚT BÁNH RĂNG ⚙️ & CAMERA QUÉT MÃ QR SERVER
   ========================================================================= */
document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("modalServerConfig");
    const btnOpen = document.getElementById("btnOpenServerConfig");
    const btnClose = document.getElementById("btnCloseServerConfig");
    const btnScan = document.getElementById("btnScanQRFromCam");
    const inputUrl = document.getElementById("inputServerTunnelUrl");
    const btnSave = document.getElementById("btnSaveServerConfig");
    const btnReset = document.getElementById("btnResetServerConfig");
    const scannerWrapper = document.getElementById("qrScannerWrapper");
    const video = document.getElementById("qrVideoPreview");

    let stream = null;
    let animId = null;

    function stopCam() {
        if (animId) cancelAnimationFrame(animId);
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        if (video) video.srcObject = null;
        if (scannerWrapper) scannerWrapper.style.display = "none";
        if (btnScan) {
            btnScan.innerText = "📷 BẬT CAMERA QUÉT MÃ QR";
            btnScan.style.background = "#0284C7";
        }
    }

    if (btnOpen) {
        btnOpen.addEventListener("click", () => {
            if (modal) modal.style.display = "flex";
            const current = localStorage.getItem("TGS_SERVER_TUNNEL_URL") || (typeof CONFIG !== "undefined" ? CONFIG.DEFAULT_SERVER_URL : "");
            if (inputUrl) inputUrl.value = current;
        });
    }

    if (btnClose) {
        btnClose.addEventListener("click", () => {
            stopCam();
            if (modal) modal.style.display = "none";
        });
    }

    if (btnScan) {
        btnScan.addEventListener("click", async () => {
            if (stream) {
                stopCam();
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false
                });
                if (video) video.srcObject = stream;
                if (scannerWrapper) scannerWrapper.style.display = "block";
                btnScan.innerText = "⏹ ĐANG QUÉT (HƯỚNG CAMERA VÀO QR)";
                btnScan.style.background = "#DC2626";

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const scanLoop = () => {
                    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
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
                                if (detected.includes("trycloudflare.com") || detected.startsWith("http")) {
                                    if (inputUrl) inputUrl.value = detected;
                                    localStorage.setItem("TGS_SERVER_TUNNEL_URL", detected);
                                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                                    alert("✓ ĐÃ NHẬN DIỆN MÁY CHỦ THÀNH CÔNG:\n" + detected);
                                    stopCam();
                                    if (modal) modal.style.display = "none";
                                    return;
                                }
                            }
                        }
                    }
                    animId = requestAnimationFrame(scanLoop);
                };
                animId = requestAnimationFrame(scanLoop);
            } catch (err) {
                alert("Không thể mở camera: " + err.message);
                stopCam();
            }
        });
    }

    if (btnSave) {
        btnSave.addEventListener("click", () => {
            const val = (inputUrl?.value || "").trim();
            if (!val) {
                alert("Vui lòng nhập hoặc quét đường link.");
                return;
            }
            localStorage.setItem("TGS_SERVER_TUNNEL_URL", val);
            alert("✓ Đã lưu đường link máy chủ!");
            stopCam();
            if (modal) modal.style.display = "none";
        });
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            localStorage.removeItem("TGS_SERVER_TUNNEL_URL");
            if (inputUrl && typeof CONFIG !== "undefined") inputUrl.value = CONFIG.DEFAULT_SERVER_URL;
            alert("✓ Đã chuyển về link mặc định!");
        });
    }
});
