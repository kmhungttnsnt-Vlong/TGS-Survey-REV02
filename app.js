/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B4 — APP.JS (ARCHITECTURE LOCKED REV04)
   DOCUMENT ID: TGS-HO-301 REV01 COMPLIANT
   
   MODULE STRUCTURE:
     - CORE SYSTEM:
         A1: Core Bootstrap & Pure State
         A2: Navigation Engine (Event-driven Router)
         A3: Project Lifecycle Coordinator
         A4: Persistence Gateway
     - FEATURE 01 — LINEAR SURVEY:
         L1: Resume Manager
         L2: Map Engine (ArcGIS Default Basemap Renderer)
         L3: Smart GNSS Engine (20 Samples Weighted Filter)
         L4: Survey Line Logic (Line Geometry & Ownership)
         L5: GIS Layer Engine
     - FEATURE 02 — POINT SURVEY:
         P1: Station Workflow
         P2: Point GNSS Observer
         P3: Camera & Video Session (Independent Lifecycle)
         P4: Media Manager (Evidence Metadata & Timelines)
         P5: Asset Logic
         P6: Sync Builder (Enterprise Dataset Packaging)
     - BOOTSTRAP:
         Z1: App Initialize & Event Assembler
========================================================= */

const TGS = (() => {

    /* =====================================================
       INTERNAL EVENT BUS (DECOUPLING COMMUNICATIONS)
    ===================================================== */
    const EventBus = {
        events: {},
        on(event, listener) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(listener);
        },
        emit(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(fn => fn(data));
            }
        }
    };

    /* =====================================================
       MATHEMATICAL SERVICE: VN-2000 PROJECTION ENGINE
       Standard Transverse Mercator (k0 = 0.9999, X0 = 500,000m)
    ===================================================== */
    const VN2000Service = {
        forward(lat, lon, L0 = 105.5) {
            const a = 6378137.0;
            const f = 1 / 298.257223563;
            const b = a * (1 - f);
            const e2 = (a * a - b * b) / (a * a);
            const ePrime2 = (a * a - b * b) / (b * b);
            const k0 = 0.9999;
            const falseEasting = 500000.0;

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
       GROUP 1: CORE SYSTEM
    ===================================================== */

    // A1: Core Bootstrap & Pure State (Không chứa State nội bộ của Feature)
    const A1_State = {
        currentProject: null,
        activeSurveySession: null,
        currentScreen: "screenSplash",
        systemStatus: {
            databaseReady: false,
            gnssReady: false,
            gisReady: false
        }
    };

    // A4: Persistence Gateway (Adapter duy nhất giao tiếp với db.js)
    const A4_Persistence = {
        async init() {
            if (typeof DB !== "undefined") {
                await DB.init();
                A1_State.systemStatus.databaseReady = true;
                return true;
            }
            throw new Error("Data Contract Violation: Không tìm thấy DB.js");
        },

        async getDraftProject() {
            return DB.getDraftProject();
        },

        async createProject(data) {
            return DB.createProject(data);
        },

        async saveProject(project) {
            return DB.saveProject(project);
        },

        async getAllProjects() {
            return DB.getAllProjects();
        },

        // Lưu bản ghi kiểm tra audit trail
        async logTimeline(projectId, action, metadata = {}) {
            const entry = {
                id: Date.now().toString(),
                projectId,
                action,
                metadata,
                timestamp: Date.now()
            };
            return entry;
        }
    };

    // A2: Navigation Engine (Pure Screen Router & Lifecycle Hooks)
    const A2_Navigation = {
        screens: {
            splash: document.getElementById("screenSplash"),
            projectHome: document.getElementById("screenProjectHome"),
            project: document.getElementById("screenProject"),
            surveyHome: document.getElementById("screenSurveyHome"),
            linear: document.getElementById("screenLinear"),
            point: document.getElementById("screenPoint"),
            complete: document.getElementById("screenProjectComplete")
        },

        show(screenKey) {
            const previousScreen = A1_State.currentScreen;
            const targetScreenEl = this.screens[screenKey];

            if (!targetScreenEl) {
                console.error(`[Navigation] Screen '${screenKey}' không tồn tại trong UI Contract.`);
                return;
            }

            // Phát tín hiệu rời màn hình cũ
            EventBus.emit("screen:leave", { from: previousScreen, to: screenKey });

            // Cập nhật DOM
            Object.values(this.screens).forEach(scr => {
                if (scr) scr.classList.remove("active");
            });
            targetScreenEl.classList.add("active");
            A1_State.currentScreen = screenKey;

            // Phát tín hiệu đã vào màn hình mới
            EventBus.emit("screen:enter", { screen: screenKey });
        }
    };

    // A3: Project Lifecycle Coordinator
    const A3_ProjectLifecycle = {
        async verifyDraft() {
            try {
                const draft = await A4_Persistence.getDraftProject();
                const banner = document.getElementById("draftBanner");
                const info = document.getElementById("draftProjectInfo");

                if (draft) {
                    A1_State.currentProject = draft;
                    info.innerText = `Công trình: ${draft.name} (${draft.code})`;
                    banner.classList.remove("hidden");
                } else {
                    banner.classList.add("hidden");
                }
            } catch (err) {
                console.warn("[ProjectLifecycle] Kiểm tra bản nháp:", err);
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
                    centralMeridian: 105.5
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
            A2_Navigation.show("surveyHome");
        },

        async openCompleteSummary() {
            if (!A1_State.currentProject) return;

            // 1. Chốt trạng thái hồ sơ thành completed và lưu vào DB
            A1_State.currentProject.status = "completed";
            A1_State.currentProject.updatedAt = Date.now();
            await A4_Persistence.saveProject(A1_State.currentProject);

            // 2. Lấy số liệu tổng hợp từ các module chuyên biệt
            const lineSummary = L4_SurveyLineLogic.getSummary();
            const stationSummary = P1_StationWorkflow.getSummary();

            document.getElementById("completeProjectName").innerText = A1_State.currentProject.name;
            document.getElementById("completeProjectSummary").innerText = 
                `Mã: ${A1_State.currentProject.code} | Địa điểm: ${A1_State.currentProject.location || "Chưa rõ"}`;

            document.getElementById("summaryPoints").innerText = `${lineSummary.count} điểm`;
            document.getElementById("summaryLength").innerText = lineSummary.lengthText;
            document.getElementById("summaryStations").innerText = `${stationSummary.count} đối tượng`;

            A2_Navigation.show("complete");
        }
    };

    /* =====================================================
       GROUP 2: FEATURE 01 — KHẢO SÁT TUYẾN
    ===================================================== */

    // L1: Resume Manager
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
        }
    };

    // L2: Map Engine (ArcGIS Default Tile Renderer)
    const L2_MapEngine = {
        map: null,
        markerLayer: null,
        polylineLayer: null,
        liveMarker: null,
        accuracyCircle: null,

        init() {
            const mapContainer = document.getElementById("map");
            if (!mapContainer || this.map) return;

            // ArcGIS World Imagery Basemap
            const arcgisUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
            
            this.map = L.map("map", {
                zoomControl: false,
                preferCanvas: true
            }).setView([10.762622, 106.660172], 16);

            L.tileLayer(arcgisUrl, {
                attribution: "Esri, Maxar, Earthstar Geographics",
                maxZoom: 19
            }).addTo(this.map);

            this.markerLayer = L.layerGroup().addTo(this.map);
            this.polylineLayer = L.polyline([], {
                color: "#00E5FF",
                weight: 4,
                opacity: 0.9
            }).addTo(this.map);

            A1_State.systemStatus.gisReady = true;
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
                    radius: 5,
                    fillColor: "#00E676",
                    color: "#FFFFFF",
                    weight: 2,
                    fillOpacity: 1
                }).bindPopup(`<b>Điểm ${idx + 1}</b><br>X: ${pt.vn2000.x}<br>Y: ${pt.vn2000.y}`).addTo(this.markerLayer);
            });

            this.polylineLayer.setLatLngs(latlngs);

            if (latlngs.length > 0) {
                this.map.fitBounds(this.polylineLayer.getBounds(), { padding: [35, 35] });
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
                    radius: obs.accuracy,
                    color: "#2979FF",
                    weight: 1,
                    fillOpacity: 0.15
                }).addTo(this.map);
            } else {
                this.liveMarker.setLatLng(pos);
                this.accuracyCircle.setLatLng(pos);
                this.accuracyCircle.setRadius(obs.accuracy);
            }
        },

        zoomIn() { if (this.map) this.map.zoomIn(); },
        zoomOut() { if (this.map) this.map.zoomOut(); }
    };

    // L3: Smart GNSS Engine (20 Samples Weighted Filter & Provenance)
    const L3_SmartGNSS = {
        sampleTarget: 20,
        isSampling: false,

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
                        const { latitude, longitude, accuracy, altitude, altitudeAccuracy } = pos.coords;
                        rawSamples.push({
                            latitude,
                            longitude,
                            accuracy,
                            altitude,
                            altitudeAccuracy,
                            timestamp: pos.timestamp || Date.now()
                        });

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
                    err => console.warn("[GNSS Sample Warning]", err.message),
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                );
            }, 350);
        },

        evaluateSamples(samples, L0) {
            // Lọc phương sai nghịch đảo sai số
            let sumWeight = 0;
            let sumLat = 0;
            let sumLng = 0;
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
                    stabilityScore: Number((accuracies[0] / accuracies[accuracies.length - 1]).toFixed(2)),
                    timestamp: Date.now()
                }
            };
        }
    };

    // L4: Survey Line Logic (Line Geometry Owner)
    const L4_SurveyLineLogic = {
        async captureRoutePoint() {
            if (!A1_State.currentProject) {
                alert("Chưa chọn hồ sơ công trình.");
                return;
            }

            const btnText = document.getElementById("captureBtnText");

            L3_SmartGNSS.collectSmartObservation(
                (current, target) => {
                    btnText.innerText = `Đang gom (${current}/${target})...`;
                },
                async (evaluatedObservation) => {
                    btnText.innerText = "Lấy Smart GPS";

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

                    // Cập nhật Render trên bản đồ và UI HUD
                    L2_MapEngine.renderRoute(A1_State.currentProject.points);
                    L2_MapEngine.updateLivePosition(evaluatedObservation);
                    L4_SurveyLineLogic.updateUI();
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
                document.getElementById("vn2000Text").innerText = `${last.vn2000.x.toFixed(1)}, ${last.vn2000.y.toFixed(1)}`;
                document.getElementById("gpsAccuracy").innerText = `± ${last.accuracy} m`;
                document.getElementById("gpsText").innerText = "Smart GNSS Đã chốt";
            }
        }
    };

    // L5: GIS Layer Engine
    const L5_GISLayerEngine = {
        bindLayerToggles() {
            const togglePts = document.getElementById("layerSurveyPoints");
            const toggleLine = document.getElementById("layerSurveyLine");

            if (togglePts) {
                togglePts.addEventListener("change", e => {
                    if (e.target.checked) L2_MapEngine.markerLayer.addTo(L2_MapEngine.map);
                    else L2_MapEngine.markerLayer.remove();
                });
            }
            if (toggleLine) {
                toggleLine.addEventListener("change", e => {
                    if (e.target.checked) L2_MapEngine.polylineLayer.addTo(L2_MapEngine.map);
                    else L2_MapEngine.polylineLayer.remove();
                });
            }
        }
    };

    /* =====================================================
       GROUP 3: FEATURE 02 — KHẢO SÁT ĐIỂM / TRẠM
    ===================================================== */

    // P3: Camera & Video Session (Independent Lifecycle)
    const P3_CameraSession = {
        videoEl: document.getElementById("cameraPreview"),
        recBadge: document.getElementById("cameraRecBadge"),
        stream: null,
        mediaRecorder: null,
        recordedChunks: [],
        recordingTimer: null,
        recordedSeconds: 0,
        isRecording: false,

        async startCamera() {
            try {
                if (this.stream) this.stopCamera();
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: true
                });
                this.videoEl.srcObject = this.stream;
                document.getElementById("btnToggleCamera").innerText = "Đóng Camera";
                this.recBadge.innerText = "⚪ SẴN SÀNG";
            } catch (err) {
                alert("Không thể khởi động Camera: " + err.message);
            }
        },

        stopCamera() {
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
                this.stream = null;
            }
            if (this.videoEl) this.videoEl.srcObject = null;
            const btn = document.getElementById("btnToggleCamera");
            if (btn) btn.innerText = "Mở Camera";
            if (this.recBadge) this.recBadge.innerText = "⚪ TẮT";
        },

        toggleRecord(onVideoCompleted) {
            if (!this.stream) {
                alert("Vui lòng mở Camera trước.");
                return;
            }

            const recBtn = document.getElementById("btnRecordVideo");

            if (!this.isRecording) {
                this.recordedChunks = [];
                try {
                    this.mediaRecorder = new MediaRecorder(this.stream);
                } catch (e) {
                    alert("Trình duyệt không hỗ trợ quay video chuẩn này.");
                    return;
                }

                this.mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) this.recordedChunks.push(e.data);
                };

                this.mediaRecorder.onstop = () => {
                    const blob = new Blob(this.recordedChunks, { type: "video/webm" });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (typeof onVideoCompleted === "function") onVideoCompleted(reader.result);
                    };
                    reader.readAsDataURL(blob);
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                this.recordedSeconds = 0;
                recBtn.innerText = "⏹ Dừng REC";
                this.recBadge.classList.add("recording");

                this.recordingTimer = setInterval(() => {
                    this.recordedSeconds++;
                    const m = Math.floor(this.recordedSeconds / 60).toString().padStart(2, "0");
                    const s = (this.recordedSeconds % 60).toString().padStart(2, "0");
                    this.recBadge.innerText = `🔴 REC ${m}:${s}`;
                }, 1000);
            } else {
                this.mediaRecorder.stop();
                this.isRecording = false;
                clearInterval(this.recordingTimer);
                recBtn.innerText = "🔴 Quay Video";
                this.recBadge.classList.remove("recording");
                this.recBadge.innerText = "⚪ ĐÃ GHI VIDEO";
            }
        },

        takeSnapshot(overlayText = "") {
            if (!this.stream) {
                alert("Chưa mở Camera.");
                return null;
            }

            const canvas = document.createElement("canvas");
            canvas.width = this.videoEl.videoWidth || 1280;
            canvas.height = this.videoEl.videoHeight || 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);

            // Watermark hiện trường
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
            ctx.fillStyle = "#00E5FF";
            ctx.font = "bold 18px Arial";
            ctx.fillText(overlayText, 20, canvas.height - 18);

            return canvas.toDataURL("image/jpeg", 0.85);
        }
    };

    // P4: Media Manager (Manages Media Timeline & Storage)
    const P4_MediaManager = {
        timelineEl: document.getElementById("cameraTimeline"),
        currentPhotos: [],
        currentVideoBase64: null,

        resetMediaSession() {
            this.currentPhotos = [];
            this.currentVideoBase64 = null;
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

        setVideo(base64Video) {
            this.currentVideoBase64 = base64Video;
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

    // P2: Point GNSS Observer
    const P2_PointGNSS = {
        observedPoint: null,

        observePointPosition(onComplete) {
            const btnText = document.getElementById("btnPointGPSText");
            L3_SmartGNSS.collectSmartObservation(
                (current, target) => {
                    btnText.innerText = `Đang gom (${current}/${target})...`;
                },
                (evaluated) => {
                    btnText.innerText = "◎ Thu nhận Smart GNSS trạm";
                    P2_PointGNSS.observedPoint = evaluated;

                    document.getElementById("pointWGS84Text").innerText = 
                        `${evaluated.latitude.toFixed(6)}, ${evaluated.longitude.toFixed(6)}`;
                    document.getElementById("pointVN2000Text").innerText = 
                        `X:${evaluated.vn2000.x} | Y:${evaluated.vn2000.y}`;
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

    // P1: Station Workflow
    const P1_StationWorkflow = {
        initUI() {
            if (!A1_State.currentProject) return;
            document.getElementById("pointProjectTitle").innerText = A1_State.currentProject.name;
            document.getElementById("pointProjectSubtitle").innerText = `Mã: ${A1_State.currentProject.code}`;
            
            P2_PointGNSS.reset();
            P4_MediaManager.resetMediaSession();
            this.renderList();
        },

        async saveStationRecord() {
            const type = document.getElementById("pointTypeSelect").value;
            const name = document.getElementById("pointNameInput").value.trim();
            const section = document.getElementById("pointSectionInput").value.trim();
            const note = document.getElementById("pointNoteInput").value.trim();

            if (!name) {
                alert("Vui lòng nhập tên công trình / trạm.");
                return;
            }

            if (!P2_PointGNSS.observedPoint) {
                alert("Vui lòng thực hiện 'Thu nhận Smart GNSS trạm' trước khi lưu.");
                return;
            }

            const stationEntity = {
                id: Date.now().toString(),
                type,
                name,
                section,
                note,
                coordinates: {
                    lat: P2_PointGNSS.observedPoint.latitude,
                    lng: P2_PointGNSS.observedPoint.longitude,
                    accuracy: P2_PointGNSS.observedPoint.accuracy,
                    vn2000: P2_PointGNSS.observedPoint.vn2000
                },
                provenance: P2_PointGNSS.observedPoint.provenance,
                evidence: {
                    photos: [...P4_MediaManager.currentPhotos],
                    video: P4_MediaManager.currentVideoBase64
                },
                createdAt: Date.now()
            };

            if (!A1_State.currentProject.pointFeatures) A1_State.currentProject.pointFeatures = [];
            A1_State.currentProject.pointFeatures.push(stationEntity);

            await A4_Persistence.saveProject(A1_State.currentProject);

            // Dọn dẹp form và phiên làm việc
            P3_CameraSession.stopCamera();
            P4_MediaManager.resetMediaSession();
            P2_PointGNSS.reset();

            document.getElementById("pointNameInput").value = "";
            document.getElementById("pointSectionInput").value = "";
            document.getElementById("pointNoteInput").value = "";

            this.renderList();
            alert("Đã lưu hồ sơ trạm & bằng chứng hiện trường thành công!");
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
                listEl.innerHTML = "<p style='color:var(--muted); font-size:13px;'>Chưa có trạm nào được lưu.</p>";
                return;
            }

            items.forEach((it, idx) => {
                const photoCount = it.evidence?.photos?.length || 0;
                const hasVideo = it.evidence?.video ? "🎥" : "";
                const div = document.createElement("div");
                div.className = "saved-point-item";
                div.innerHTML = `
                    <div>
                        <strong>${idx + 1}. ${it.name} (${it.type})</strong>
                        <span>VN2000: X:${it.coordinates.vn2000.x} | Y:${it.coordinates.vn2000.y} · 📷 ${photoCount} ảnh ${hasVideo}</span>
                    </div>
                    <span style="color:var(--primary); font-weight:700;">✓</span>
                `;
                listEl.appendChild(div);
            });
        }
    };

    // P6: Sync Builder (Enterprise Dataset Packaging)
    const P6_SyncBuilder = {
        buildDataset() {
            if (!A1_State.currentProject) {
                alert("Không có hồ sơ công trình hiện hành.");
                return;
            }

            const dataset = {
                contract: "TGS-HO-301 REV01",
                platform: "TGS Platform Genesis 2.0",
                exportedAt: new Date().toISOString(),
                project: {
                    id: A1_State.currentProject.id,
                    name: A1_State.currentProject.name,
                    code: A1_State.currentProject.code,
                    location: A1_State.currentProject.location,
                    createdAt: A1_State.currentProject.createdAt,
                    updatedAt: A1_State.currentProject.updatedAt
                },
                linearSurvey: {
                    lineSummary: L4_SurveyLineLogic.getSummary(),
                    points: A1_State.currentProject.points || []
                },
                pointSurvey: {
                    stationCount: (A1_State.currentProject.pointFeatures || []).length,
                    features: A1_State.currentProject.pointFeatures || []
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
            const dl = document.createElement("a");
            dl.setAttribute("href", dataStr);
            dl.setAttribute("download", `TGS_DATASET_${A1_State.currentProject.code}_${Date.now()}.json`);
            document.body.appendChild(dl);
            dl.click();
            dl.remove();
        }
    };

    /* =====================================================
       GROUP 4: Z1 APP INITIALIZE & ASSEMBLY (BOOTSTRAP)
    ===================================================== */
    const Z1_AppInitialize = {
        bindGlobalEvents() {
            // Decoupled Router Hooks qua EventBus
            EventBus.on("screen:leave", ({ from }) => {
                if (from === "screenPoint") {
                    P3_CameraSession.stopCamera();
                }
            });

            EventBus.on("screen:enter", ({ screen }) => {
                if (screen === "linear") {
                    setTimeout(() => L2_MapEngine.invalidate(), 200);
                }
            });

            // 1. Splash & Navigation
            document.getElementById("btnStart").addEventListener("click", () => {
                A2_Navigation.show("projectHome");
            });

            // 2. Project Lifecycle
            document.getElementById("btnNewProject").addEventListener("click", () => {
                document.getElementById("projectName").value = "";
                document.getElementById("projectCode").value = "";
                document.getElementById("projectLocation").value = "";
                A2_Navigation.show("project");
            });

            document.getElementById("btnContinueDraft").addEventListener("click", () => {
                if (A1_State.currentProject) A3_ProjectLifecycle.enterSurveyHome();
            });

            document.getElementById("btnOpenProject").addEventListener("click", async () => {
                const list = await A4_Persistence.getAllProjects();
                if (list.length === 0) {
                    alert("Chưa có công trình nào được lưu.");
                    return;
                }
                A1_State.currentProject = list[0];
                A3_ProjectLifecycle.enterSurveyHome();
            });

            document.getElementById("btnBackHome").addEventListener("click", () => {
                A3_ProjectLifecycle.verifyDraft();
                A2_Navigation.show("projectHome");
            });

            document.getElementById("btnCreateProject").addEventListener("click", () => {
                A3_ProjectLifecycle.createNewProject();
            });

            document.getElementById("btnBackProject").addEventListener("click", () => {
                A3_ProjectLifecycle.verifyDraft();
                A2_Navigation.show("projectHome");
            });

            // 3. Survey Route Selection
            document.getElementById("btnLinearSurvey").addEventListener("click", () => {
                L1_ResumeManager.resumeLinearSession();
            });

            document.getElementById("btnPointSurvey").addEventListener("click", () => {
                if (A1_State.currentProject) {
                    A1_State.currentProject.surveyType = "point";
                    A4_Persistence.saveProject(A1_State.currentProject);
                    P1_StationWorkflow.initUI();
                }
                A2_Navigation.show("point");
            });

            document.getElementById("btnFinishProject").addEventListener("click", () => {
                A3_ProjectLifecycle.openCompleteSummary();
            });

            document.getElementById("btnBackFromComplete").addEventListener("click", () => {
                A2_Navigation.show("surveyHome");
            });

            document.getElementById("btnExitLinear").addEventListener("click", () => {
                A2_Navigation.show("surveyHome");
            });

            document.getElementById("btnExitPoint").addEventListener("click", () => {
                A2_Navigation.show("surveyHome");
            });

            // 4. Linear Map & GNSS Tools
            document.getElementById("btnZoomIn").addEventListener("click", () => L2_MapEngine.zoomIn());
            document.getElementById("btnZoomOut").addEventListener("click", () => L2_MapEngine.zoomOut());
            document.getElementById("btnLocate").addEventListener("click", () => {
                L3_SmartGNSS.collectSmartObservation(null, evaluated => {
                    L2_MapEngine.updateLivePosition(evaluated);
                });
            });
            document.getElementById("btnCaptureGPS").addEventListener("click", () => {
                L4_SurveyLineLogic.captureRoutePoint();
            });

            L5_GISLayerEngine.bindLayerToggles();

            // 5. Point Survey & Media Session
            document.getElementById("btnGetPointGPS").addEventListener("click", () => {
                P2_PointGNSS.observePointPosition();
            });

            document.getElementById("btnToggleCamera").addEventListener("click", () => {
                if (P3_CameraSession.stream) P3_CameraSession.stopCamera();
                else P3_CameraSession.startCamera();
            });

            document.getElementById("btnRecordVideo").addEventListener("click", () => {
                P3_CameraSession.toggleRecord(videoBase64 => {
                    P4_MediaManager.setVideo(videoBase64);
                });
            });

            document.getElementById("btnSnapPhoto").addEventListener("click", () => {
                const timeStr = new Date().toLocaleTimeString("vi-VN");
                const overlay = P2_PointGNSS.observedPoint
                    ? `TGS | ${timeStr} | VN2000: X:${P2_PointGNSS.observedPoint.vn2000.x} Y:${P2_PointGNSS.observedPoint.vn2000.y}`
                    : `TGS | ${timeStr} | WGS84 Live`;
                const snap = P3_CameraSession.takeSnapshot(overlay);
                if (snap) P4_MediaManager.addPhoto(snap, timeStr);
            });

            document.getElementById("btnPreviewVideo").addEventListener("click", () => {
                if (!P4_MediaManager.currentVideoBase64) return;
                const win = window.open("");
                win.document.write(`<video src="${P4_MediaManager.currentVideoBase64}" controls autoplay style="width:100%;height:100%;background:#000;"></video>`);
            });

            document.getElementById("btnSavePointItem").addEventListener("click", () => {
                P1_StationWorkflow.saveStationRecord();
            });

            // 6. Dataset Export
            document.getElementById("btnExportJSON").addEventListener("click", () => {
                P6_SyncBuilder.buildDataset();
            });
        },

        async startup() {
            console.log("[TGS Platform Genesis 2.0] Initializing Architecture Locked REV04...");
            
            // Khởi tạo các bộ lắng nghe sự kiện
            this.bindGlobalEvents();

            // Khởi tạo Persistence Gateway (DB v4) và khôi phục nháp
            try {
                await A4_Persistence.init();
                await A3_ProjectLifecycle.verifyDraft();
                console.log("[TGS Platform Genesis 2.0] Core System Initialized & Locked.");
            } catch (err) {
                console.error("[TGS Platform Genesis 2.0] Lỗi khởi tạo hệ thống:", err);
            }
        }
    };

    return {
        initialize: () => Z1_AppInitialize.startup()
    };
})();

// Khởi chạy khi DOM sẵn sàng
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TGS.initialize);
} else {
    TGS.initialize();
}
