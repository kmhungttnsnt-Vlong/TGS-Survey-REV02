/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B4 — APP.JS (LOGIC CONTRACT - FULL QA READY)
   MODULES:
     - A1 Core Bootstrap & State
     - A2 Navigation Engine
     - A3 Project Lifecycle
     - A4 Persistence Gateway
     - L1 Resume Manager
     - L2 MapEngine (GIS Core)
     - L3 GPSManager (Smart GNSS - 20 Samples Weighted QA-03)
     - L4 Survey Line Logic
     - L5 GIS Layer Engine
     - P1 Station Workflow & P2 Point GPS
     - P6 Sync Builder & QA-05 Dataset Export
     - Z1 Initialize (Bootstrap Assembler)
========================================================= */

const TGS = (() => {

    /* =====================================================
       COORDINATE TRANSFORMATION SERVICE (VN-2000 ENGINE)
       Chuẩn quy chuẩn đo đạc: Múi 3° (k0 = 0.9999, X0 = 500,000m)
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
       A1: CORE BOOTSTRAP & STATE
    ===================================================== */
    const State = {
        currentProject: null,
        lastPosition: null,
        tempStationGPS: null,
        isSampling: false
    };

    /* =====================================================
       A2: NAVIGATION ENGINE
    ===================================================== */
    const Navigation = {
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
            Object.values(Navigation.screens).forEach(scr => {
                if (scr) scr.classList.remove("active");
            });

            const target = Navigation.screens[screenKey];
            if (target) {
                target.classList.add("active");
            }

            if (screenKey === "linear") {
                setTimeout(() => MapEngine.invalidate(), 250);
            }
        }
    };

    /* =====================================================
       A4: PERSISTENCE GATEWAY (ADAPTER TO DB.JS)
    ===================================================== */
    const Persistence = {
        async init() {
            if (typeof DB !== "undefined") {
                return DB.init();
            }
            return Promise.reject(new Error("Không tìm thấy DB.js"));
        },

        async getDraft() {
            return DB.getDraftProject();
        },

        async save(project) {
            return DB.saveProject(project);
        },

        async create(data) {
            return DB.createProject(data);
        },

        async getAll() {
            return DB.getAllProjects();
        }
    };

    /* =====================================================
       A3: PROJECT LIFECYCLE
    ===================================================== */
    const ProjectLifecycle = {
        async checkDraft() {
            try {
                const draft = await Persistence.getDraft();
                const banner = document.getElementById("draftBanner");
                const info = document.getElementById("draftProjectInfo");

                if (draft) {
                    State.currentProject = draft;
                    info.innerText = `Công trình: ${draft.name} (${draft.code})`;
                    banner.classList.remove("hidden");
                } else {
                    banner.classList.add("hidden");
                }
            } catch (err) {
                console.warn("[ProjectLifecycle] Kiểm tra bản nháp:", err);
            }
        },

        async handleCreate() {
            const name = document.getElementById("projectName").value.trim();
            const code = document.getElementById("projectCode").value.trim();
            const location = document.getElementById("projectLocation").value.trim();

            if (!name || !code) {
                alert("Vui lòng nhập tên và mã công trình.");
                return;
            }

            const project = await Persistence.create({ name, code, location });
            State.currentProject = project;
            ProjectLifecycle.enterSurveyHome();
        },

        enterSurveyHome() {
            if (!State.currentProject) return;
            document.getElementById("surveyProjectTitle").innerText = State.currentProject.name;
            Navigation.show("surveyHome");
        },

        openCompleteScreen() {
            if (!State.currentProject) return;
            const pts = State.currentProject.points || [];
            const stations = State.currentProject.pointFeatures || [];

            document.getElementById("completeProjectName").innerText = State.currentProject.name;
            document.getElementById("completeProjectSummary").innerText = `Mã hồ sơ: ${State.currentProject.code} | Địa điểm: ${State.currentProject.location || "Chưa rõ"}`;

            let totalLen = 0;
            for (let i = 1; i < pts.length; i++) {
                const p1 = L.latLng(pts[i - 1].lat, pts[i - 1].lng);
                const p2 = L.latLng(pts[i].lat, pts[i].lng);
                totalLen += p1.distanceTo(p2);
            }

            document.getElementById("summaryPoints").innerText = `${pts.length} điểm`;
            document.getElementById("summaryLength").innerText = totalLen >= 1000 ? `${(totalLen / 1000).toFixed(2)} km` : `${Math.round(totalLen)} m`;
            document.getElementById("summaryStations").innerText = `${stations.length} đối tượng`;

            Navigation.show("complete");
        }
    };

    /* =====================================================
       L2 & L5: MAP ENGINE & GIS LAYERS (FEATURE 01)
    ===================================================== */
    const MapEngine = {
        map: null,
        lineLayer: null,
        markerLayer: null,
        currentGPSMarker: null,
        accuracyCircle: null,

        init() {
            if (MapEngine.map) return;

            MapEngine.map = L.map("map", { zoomControl: false }).setView([10.762622, 106.660172], 16);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors | TGS Genesis 2.0",
                maxZoom: 19
            }).addTo(MapEngine.map);

            MapEngine.markerLayer = L.layerGroup().addTo(MapEngine.map);
            MapEngine.lineLayer = L.polyline([], { color: "#1565C0", weight: 4 }).addTo(MapEngine.map);

            MapEngine.renderSurveyData();
        },

        invalidate() {
            if (!MapEngine.map) {
                MapEngine.init();
            } else {
                MapEngine.map.invalidateSize();
            }
        },

        renderSurveyData() {
            if (!State.currentProject) return;
            MapEngine.markerLayer.clearLayers();

            const pts = State.currentProject.points || [];
            const latlngs = [];

            pts.forEach((pt, i) => {
                const pos = [pt.lat, pt.lng];
                latlngs.push(pos);

                L.circleMarker(pos, {
                    radius: 6,
                    fillColor: "#2E7D32",
                    color: "#FFFFFF",
                    weight: 2,
                    fillOpacity: 1
                }).bindPopup(`<b>Điểm tim ${i + 1}</b><br>X: ${pt.vn2000.x}<br>Y: ${pt.vn2000.y}<br>Sai số: ±${pt.accuracy}m`).addTo(MapEngine.markerLayer);
            });

            MapEngine.lineLayer.setLatLngs(latlngs);

            if (latlngs.length > 0) {
                MapEngine.map.fitBounds(MapEngine.lineLayer.getBounds(), { padding: [35, 35] });
            }

            SurveyLineLogic.calculateMetrics();
        },

        updateLivePosition(pos) {
            if (!MapEngine.map) return;
            MapEngine.map.setView([pos.lat, pos.lng], 18);

            if (!MapEngine.currentGPSMarker) {
                MapEngine.currentGPSMarker = L.circleMarker([pos.lat, pos.lng], {
                    radius: 7, fillColor: "#1565C0", color: "#FFFFFF", weight: 2, fillOpacity: 1
                }).addTo(MapEngine.map);

                MapEngine.accuracyCircle = L.circle([pos.lat, pos.lng], {
                    radius: pos.accuracy, color: "#1565C0", weight: 1, fillOpacity: 0.15
                }).addTo(MapEngine.map);
            } else {
                MapEngine.currentGPSMarker.setLatLng([pos.lat, pos.lng]);
                MapEngine.accuracyCircle.setLatLng([pos.lat, pos.lng]);
                MapEngine.accuracyCircle.setRadius(pos.accuracy);
            }
        },

        zoomIn() { if (MapEngine.map) MapEngine.map.zoomIn(); },
        zoomOut() { if (MapEngine.map) MapEngine.map.zoomOut(); }
    };

    /* =====================================================
       L3: SMART GNSS ENGINE (QA-03: 20 SAMPLES WEIGHTED FILTER)
    ===================================================== */
    const GPSManager = {
        sampleTarget: 20,

        // Lấy nhanh vị trí hiện thời
        quickLocate(onSuccess) {
            if (!navigator.geolocation) {
                alert("Thiết bị không hỗ trợ Geolocation.");
                return;
            }

            const gpsText = document.getElementById("gpsText");
            gpsText.innerText = "Đang bắt vệ tinh...";

            navigator.geolocation.getCurrentPosition(
                pos => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    const L0 = State.currentProject?.meta?.centralMeridian || 105.5;
                    const vn2000 = VN2000Service.forward(latitude, longitude, L0);

                    State.lastPosition = { lat: latitude, lng: longitude, accuracy: Math.round(accuracy), vn2000 };

                    gpsText.innerText = "Đã khóa vị trí";
                    document.getElementById("gpsAccuracy").innerText = `± ${Math.round(accuracy)} m`;
                    document.getElementById("vn2000Text").innerText = `${vn2000.x.toFixed(1)}, ${vn2000.y.toFixed(1)}`;

                    MapEngine.updateLivePosition(State.lastPosition);
                    if (typeof onSuccess === "function") onSuccess(State.lastPosition);
                },
                err => {
                    gpsText.innerText = "Mất tín hiệu";
                    alert("Lỗi GPS: " + err.message);
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            );
        },

        // Thu thập chuỗi 20 mẫu GNSS chính xác cao
        startSmartGPS(progressCallback, completeCallback) {
            if (State.isSampling) return;
            if (!navigator.geolocation) {
                alert("Thiết bị không hỗ trợ Geolocation.");
                return;
            }

            State.isSampling = true;
            const samples = [];
            const L0 = State.currentProject?.meta?.centralMeridian || 105.5;

            const watchId = navigator.geolocation.watchPosition(
                pos => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    samples.push({ lat: latitude, lng: longitude, accuracy });

                    if (typeof progressCallback === "function") {
                        progressCallback(samples.length, GPSManager.sampleTarget);
                    }

                    if (samples.length >= GPSManager.sampleTarget) {
                        navigator.geolocation.clearWatch(watchId);
                        State.isSampling = false;

                        // Tính toán tọa độ đại diện bằng trọng số nghịch đảo phương sai sai số (Inverse-variance weighting)
                        let sumWeights = 0;
                        let weightedLat = 0;
                        let weightedLng = 0;
                        let minAcc = Infinity;

                        samples.forEach(s => {
                            const weight = 1 / Math.max(s.accuracy * s.accuracy, 1);
                            sumWeights += weight;
                            weightedLat += s.lat * weight;
                            weightedLng += s.lng * weight;
                            if (s.accuracy < minAcc) minAcc = s.accuracy;
                        });

                        const finalLat = weightedLat / sumWeights;
                        const finalLng = weightedLng / sumWeights;
                        const finalAcc = Math.round(minAcc);
                        const finalVN2000 = VN2000Service.forward(finalLat, finalLng, L0);

                        const representative = {
                            lat: finalLat,
                            lng: finalLng,
                            accuracy: finalAcc,
                            vn2000: finalVN2000,
                            sampleCount: samples.length
                        };

                        State.lastPosition = representative;
                        MapEngine.updateLivePosition(representative);

                        document.getElementById("gpsText").innerText = `Smart GNSS (20/20)`;
                        document.getElementById("gpsAccuracy").innerText = `± ${finalAcc} m`;
                        document.getElementById("vn2000Text").innerText = `${finalVN2000.x.toFixed(1)}, ${finalVN2000.y.toFixed(1)}`;

                        if (typeof completeCallback === "function") {
                            completeCallback(representative);
                        }
                    }
                },
                err => {
                    navigator.geolocation.clearWatch(watchId);
                    State.isSampling = false;
                    alert("Gián đoạn thu nhận Smart GNSS: " + err.message);
                },
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        }
    };

    /* =====================================================
       L4: SURVEY LINE LOGIC (FEATURE 01)
    ===================================================== */
    const SurveyLineLogic = {
        async triggerSmartCapture() {
            if (!State.currentProject) {
                alert("Chưa có hồ sơ công trình hiện hành.");
                return;
            }

            const btnText = document.getElementById("captureBtnText");

            GPSManager.startSmartGPS(
                (current, target) => {
                    btnText.innerText = `Đang gom (${current}/${target})...`;
                },
                async (representative) => {
                    btnText.innerText = "Lấy Smart GPS";

                    const pointRecord = {
                        id: Date.now().toString(),
                        lat: representative.lat,
                        lng: representative.lng,
                        accuracy: representative.accuracy,
                        vn2000: representative.vn2000,
                        sampleCount: representative.sampleCount,
                        timestamp: Date.now()
                    };

                    if (!State.currentProject.points) State.currentProject.points = [];
                    State.currentProject.points.push(pointRecord);

                    await Persistence.save(State.currentProject);
                    MapEngine.renderSurveyData();
                }
            );
        },

        calculateMetrics() {
            const pts = State.currentProject?.points || [];
            document.getElementById("pointCount").innerText = pts.length;

            let length = 0;
            for (let i = 1; i < pts.length; i++) {
                const p1 = L.latLng(pts[i - 1].lat, pts[i - 1].lng);
                const p2 = L.latLng(pts[i].lat, pts[i].lng);
                length += p1.distanceTo(p2);
            }

            document.getElementById("lineLength").innerText = length >= 1000
                ? `${(length / 1000).toFixed(2)} km`
                : `${Math.round(length)} m`;
        }
    };

    /* =====================================================
       P1 & P2: STATION WORKFLOW & POINT SURVEY (FEATURE 02)
    ===================================================== */
    const PointSurvey = {
        initUI() {
            if (!State.currentProject) return;
            document.getElementById("pointProjectTitle").innerText = State.currentProject.name;
            document.getElementById("pointProjectSubtitle").innerText = `Mã: ${State.currentProject.code}`;
            PointSurvey.renderList();
        },

        getStationGPS() {
            const btnText = document.getElementById("btnPointGPSText");

            GPSManager.startSmartGPS(
                (current, target) => {
                    btnText.innerText = `Đang gom (${current}/${target})...`;
                },
                (representative) => {
                    btnText.innerText = "◎ Thu nhận GNSS trạm";
                    State.tempStationGPS = representative;

                    document.getElementById("pointWGS84Text").innerText = `${representative.lat.toFixed(6)}, ${representative.lng.toFixed(6)}`;
                    document.getElementById("pointVN2000Text").innerText = `X:${representative.vn2000.x} | Y:${representative.vn2000.y}`;
                    document.getElementById("pointAccuracyText").innerText = `± ${representative.accuracy} m (20 mẫu)`;
                }
            );
        },

        async saveStation() {
            const type = document.getElementById("pointTypeSelect").value;
            const name = document.getElementById("pointNameInput").value.trim();
            const note = document.getElementById("pointNoteInput").value.trim();

            if (!name) {
                alert("Vui lòng nhập tên/ký hiệu trạm.");
                return;
            }

            if (!State.tempStationGPS) {
                alert("Vui lòng bấm 'Thu nhận GNSS trạm' (20 mẫu) trước khi lưu.");
                return;
            }

            const item = {
                id: Date.now().toString(),
                type,
                name,
                note,
                lat: State.tempStationGPS.lat,
                lng: State.tempStationGPS.lng,
                accuracy: State.tempStationGPS.accuracy,
                vn2000: State.tempStationGPS.vn2000,
                timestamp: Date.now()
            };

            if (!State.currentProject.pointFeatures) State.currentProject.pointFeatures = [];
            State.currentProject.pointFeatures.push(item);

            await Persistence.save(State.currentProject);

            // Reset UI Form
            document.getElementById("pointNameInput").value = "";
            document.getElementById("pointNoteInput").value = "";
            document.getElementById("pointWGS84Text").innerText = "Chưa thu nhận";
            document.getElementById("pointVN2000Text").innerText = "Chưa chuyển";
            document.getElementById("pointAccuracyText").innerText = "± -- m";
            State.tempStationGPS = null;

            PointSurvey.renderList();
            alert("Đã lưu hồ sơ trạm thành công.");
        },

        renderList() {
            const list = document.getElementById("savedPointsList");
            const count = document.getElementById("savedPointsCount");
            const items = State.currentProject?.pointFeatures || [];

            count.innerText = items.length;
            list.innerHTML = "";

            if (items.length === 0) {
                list.innerHTML = "<p style='color:var(--muted);font-size:13px;'>Chưa có trạm nào được lưu.</p>";
                return;
            }

            items.forEach((it, idx) => {
                const row = document.createElement("div");
                row.className = "saved-point-item";
                row.innerHTML = `
                    <div>
                        <strong>${idx + 1}. ${it.name} (${it.type})</strong>
                        <span>VN2000: X:${it.vn2000.x} | Y:${it.vn2000.y} (±${it.accuracy}m)</span>
                    </div>
                    <span style="color:var(--primary); font-weight:700;">✓</span>
                `;
                list.appendChild(row);
            });
        }
    };

    /* =====================================================
       P6 & QA-05: SYNC BUILDER & DATASET EXPORT
    ===================================================== */
    const SyncBuilder = {
        exportJSON() {
            if (!State.currentProject) {
                alert("Không có dữ liệu công trình để xuất.");
                return;
            }

            const dataset = {
                metadata: {
                    platform: "TGS Platform Genesis 2.0",
                    baseline: "TGS-HO-301 REV01",
                    exportTime: new Date().toISOString(),
                    coordinateSystem: {
                        geographic: "WGS84",
                        projected: "VN-2000",
                        centralMeridian: State.currentProject.meta?.centralMeridian || 105.5
                    }
                },
                project: {
                    id: State.currentProject.id,
                    name: State.currentProject.name,
                    code: State.currentProject.code,
                    location: State.currentProject.location,
                    createdAt: State.currentProject.createdAt,
                    updatedAt: State.currentProject.updatedAt
                },
                surveyLine: {
                    pointCount: (State.currentProject.points || []).length,
                    points: State.currentProject.points || []
                },
                stations: {
                    stationCount: (State.currentProject.pointFeatures || []).length,
                    items: State.currentProject.pointFeatures || []
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `TGS_DATASET_${State.currentProject.code}_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }
    };

    /* =====================================================
       Z1: APP INITIALIZE & BINDINGS (LOCKED CONTRACT)
    ===================================================== */
    function bindButtons() {
        // Splash -> Project Home
        document.getElementById("btnStart").addEventListener("click", () => {
            Navigation.show("projectHome");
        });

        // Project Home Actions
        document.getElementById("btnNewProject").addEventListener("click", () => {
            document.getElementById("projectName").value = "";
            document.getElementById("projectCode").value = "";
            document.getElementById("projectLocation").value = "";
            Navigation.show("project");
        });

        document.getElementById("btnContinueDraft").addEventListener("click", () => {
            if (State.currentProject) ProjectLifecycle.enterSurveyHome();
        });

        document.getElementById("btnOpenProject").addEventListener("click", async () => {
            const list = await Persistence.getAll();
            if (list.length === 0) {
                alert("Chưa có công trình nào được lưu.");
                return;
            }
            State.currentProject = list[0];
            ProjectLifecycle.enterSurveyHome();
        });

        // Project Form Actions
        document.getElementById("btnBackHome").addEventListener("click", () => Navigation.show("projectHome"));
        document.getElementById("btnCreateProject").addEventListener("click", ProjectLifecycle.handleCreate);

        // Survey Home Actions
        document.getElementById("btnBackProject").addEventListener("click", () => Navigation.show("projectHome"));
        
        document.getElementById("btnLinearSurvey").addEventListener("click", () => {
            if (State.currentProject) {
                document.getElementById("linearProjectName").innerText = `${State.currentProject.name} (${State.currentProject.code})`;
                State.currentProject.surveyType = "linear";
                Persistence.save(State.currentProject);
            }
            Navigation.show("linear");
        });

        document.getElementById("btnPointSurvey").addEventListener("click", () => {
            if (State.currentProject) {
                State.currentProject.surveyType = "point";
                Persistence.save(State.currentProject);
                PointSurvey.initUI();
            }
            Navigation.show("point");
        });

        document.getElementById("btnFinishProject").addEventListener("click", ProjectLifecycle.openCompleteScreen);
        document.getElementById("btnBackFromComplete").addEventListener("click", () => Navigation.show("surveyHome"));
        document.getElementById("btnExportJSON").addEventListener("click", SyncBuilder.exportJSON);

        // Back from Linear & Point
        document.getElementById("btnExitLinear").addEventListener("click", () => Navigation.show("surveyHome"));
        document.getElementById("btnExitPoint").addEventListener("click", () => Navigation.show("surveyHome"));

        // Map Tools
        document.getElementById("btnZoomIn").addEventListener("click", MapEngine.zoomIn);
        document.getElementById("btnZoomOut").addEventListener("click", MapEngine.zoomOut);
        document.getElementById("btnLocate").addEventListener("click", () => GPSManager.quickLocate());
        document.getElementById("btnCaptureGPS").addEventListener("click", SurveyLineLogic.triggerSmartCapture);

        // Point Survey Tools
        document.getElementById("btnGetPointGPS").addEventListener("click", PointSurvey.getStationGPS);
        document.getElementById("btnSavePointItem").addEventListener("click", PointSurvey.saveStation);
    }

    async function initializeApp() {
        console.log("[TGS Platform Genesis 2.0] Khởi tạo hệ thống Baseline REV01 hoàn chỉnh...");
        
        // 1. Luôn gán toàn bộ sự kiện nút bấm đầu tiên để đảm bảo tính sẵn sàng của UI
        bindButtons();

        // 2. Nạp bất đồng bộ CSDL IndexedDB và khôi phục bản nháp
        try {
            await Persistence.init();
            await ProjectLifecycle.checkDraft();
            console.log("[TGS Platform Genesis 2.0] Database và Lifecycle sẵn sàng.");
        } catch (err) {
            console.error("[TGS Platform Genesis 2.0] Cảnh báo khởi tạo:", err);
        }
    }

    return { initializeApp };
})();

// Kích hoạt khi DOM sẵn sàng
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TGS.initializeApp);
} else {
    TGS.initializeApp();
}
