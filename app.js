/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B4 — APP.JS (LOGIC CONTRACT)
   MODULES: A1-A4 (CORE), L1-L5 (LINEAR), P1-P2 (POINT), Z1 (INIT)
========================================================= */

const TGS = (() => {

    /* =====================================================
       COORDINATE TRANSFORMATION HELPER: VN-2000
       Phép chiếu TM WGS84 -> VN2000 (Múi 3° k0 = 0.9999)
    ===================================================== */
    const VN2000Engine = {
        forward(lat, lon, L0 = 105.5) {
            const a = 6378137.0;
            const f = 1 / 298.257223563;
            const b = a * (1 - f);
            const e2 = (a * a - b * b) / (a * a);
            const ePrime2 = (a * a - b * b) / (b * b);
            const k0 = 0.9999;
            const x0 = 500000.0;

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

            const y = x0 + k0 * N * (
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
                x: Number(x.toFixed(2)),
                y: Number(y.toFixed(2))
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
        activeScreen: "screenSplash"
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
            Object.values(Navigation.screens).forEach(el => {
                if (el) el.classList.remove("active");
            });

            const target = Navigation.screens[screenKey];
            if (target) {
                target.classList.add("active");
                State.activeScreen = target.id;
            }

            if (screenKey === "linear") {
                setTimeout(() => MapEngine.invalidate(), 200);
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
            return Promise.resolve(false);
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
                console.warn("[ProjectLifecycle] Không tìm thấy bản nháp:", err);
            }
        },

        async handleCreate() {
            const name = document.getElementById("projectName").value.trim();
            const code = document.getElementById("projectCode").value.trim();
            const location = document.getElementById("projectLocation").value.trim();

            if (!name || !code) {
                alert("Vui lòng điền tên và mã công trình.");
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

        init() {
            if (MapEngine.map) return;

            MapEngine.map = L.map("map", { zoomControl: false }).setView([10.762622, 106.660172], 16);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
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
                }).bindPopup(`<b>Điểm ${i + 1}</b><br>X: ${pt.vn2000.x}<br>Y: ${pt.vn2000.y}`).addTo(MapEngine.markerLayer);
            });

            MapEngine.lineLayer.setLatLngs(latlngs);

            if (latlngs.length > 0) {
                MapEngine.map.fitBounds(MapEngine.lineLayer.getBounds(), { padding: [30, 30] });
            }

            SurveyLineLogic.calculateMetrics();
        },

        zoomIn() { if (MapEngine.map) MapEngine.map.zoomIn(); },
        zoomOut() { if (MapEngine.map) MapEngine.map.zoomOut(); }
    };

    /* =====================================================
       L3: SMART GNSS ENGINE
    ===================================================== */
    const GPSEngine = {
        locate(onSuccess) {
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
                    const vn2000 = VN2000Engine.forward(latitude, longitude, L0);

                    State.lastPosition = { lat: latitude, lng: longitude, accuracy, vn2000 };

                    gpsText.innerText = "Đã khóa vị trí";
                    document.getElementById("gpsAccuracy").innerText = `± ${Math.round(accuracy)} m`;
                    document.getElementById("vn2000Text").innerText = `${vn2000.x.toFixed(1)}, ${vn2000.y.toFixed(1)}`;

                    if (MapEngine.map) {
                        MapEngine.map.setView([latitude, longitude], 18);
                        if (!MapEngine.currentGPSMarker) {
                            MapEngine.currentGPSMarker = L.circleMarker([latitude, longitude], {
                                radius: 8, fillColor: "#1565C0", color: "#FFFFFF", weight: 2, fillOpacity: 1
                            }).addTo(MapEngine.map);
                        } else {
                            MapEngine.currentGPSMarker.setLatLng([latitude, longitude]);
                        }
                    }

                    if (typeof onSuccess === "function") onSuccess(State.lastPosition);
                },
                err => {
                    gpsText.innerText = "Mất tín hiệu";
                    alert("Lỗi GPS: " + err.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }
    };

    /* =====================================================
       L4: SURVEY LINE LOGIC (FEATURE 01)
    ===================================================== */
    const SurveyLineLogic = {
        async capturePoint() {
            if (!State.lastPosition) {
                GPSEngine.locate(() => SurveyLineLogic.capturePoint());
                return;
            }

            if (!State.currentProject) return;

            const pointRecord = {
                id: Date.now().toString(),
                lat: State.lastPosition.lat,
                lng: State.lastPosition.lng,
                accuracy: State.lastPosition.accuracy,
                vn2000: State.lastPosition.vn2000,
                timestamp: Date.now()
            };

            if (!State.currentProject.points) State.currentProject.points = [];
            State.currentProject.points.push(pointRecord);

            await Persistence.save(State.currentProject);

            MapEngine.renderSurveyData();
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

        getGPS() {
            GPSEngine.locate(pos => {
                State.tempStationGPS = pos;
                document.getElementById("pointWGS84Text").innerText = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
                document.getElementById("pointVN2000Text").innerText = `X:${pos.vn2000.x} | Y:${pos.vn2000.y}`;
                document.getElementById("pointAccuracyText").innerText = `± ${Math.round(pos.accuracy)} m`;
            });
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
                alert("Vui lòng nhấn 'Lấy GPS trạm' trước khi lưu.");
                return;
            }

            const item = {
                id: Date.now().toString(),
                type,
                name,
                note,
                lat: State.tempStationGPS.lat,
                lng: State.tempStationGPS.lng,
                vn2000: State.tempStationGPS.vn2000,
                timestamp: Date.now()
            };

            if (!State.currentProject.pointFeatures) State.currentProject.pointFeatures = [];
            State.currentProject.pointFeatures.push(item);

            await Persistence.save(State.currentProject);

            // Reset Form
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
                        <span>VN2000: X:${it.vn2000.x} | Y:${it.vn2000.y}</span>
                    </div>
                    <span style="color:var(--primary); font-weight:700;">✓</span>
                `;
                list.appendChild(row);
            });
        }
    };

    /* =====================================================
       Z1: APP INITIALIZE & BINDINGS (LOCKED)
    ===================================================== */
    function bindButtons() {
        // 1. Splash -> Project Home (KHẮC PHỤC TRIỆT ĐỂ LỖI NÚT BẮT ĐẦU)
        const btnStart = document.getElementById("btnStart");
        if (btnStart) {
            btnStart.addEventListener("click", () => {
                Navigation.show("projectHome");
            });
        }

        // 2. Project Home
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

        // 3. Project Form -> Save
        document.getElementById("btnBackHome").addEventListener("click", () => Navigation.show("projectHome"));
        document.getElementById("btnCreateProject").addEventListener("click", ProjectLifecycle.handleCreate);

        // 4. Survey Home
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

        // 5. Back Navigation
        document.getElementById("btnExitLinear").addEventListener("click", () => Navigation.show("surveyHome"));
        document.getElementById("btnExitPoint").addEventListener("click", () => Navigation.show("surveyHome"));

        // 6. Map & GPS Actions
        document.getElementById("btnZoomIn").addEventListener("click", MapEngine.zoomIn);
        document.getElementById("btnZoomOut").addEventListener("click", MapEngine.zoomOut);
        document.getElementById("btnLocate").addEventListener("click", () => GPSEngine.locate());
        document.getElementById("btnCaptureGPS").addEventListener("click", SurveyLineLogic.capturePoint);

        // 7. Point Survey Actions
        document.getElementById("btnGetPointGPS").addEventListener("click", PointSurvey.getGPS);
        document.getElementById("btnSavePointItem").addEventListener("click", PointSurvey.saveStation);
    }

    async function initializeApp() {
        console.log("[TGS Platform Genesis 2.0] Khởi động hệ thống Baseline REV01...");
        
        // Luôn gán sự kiện trước tiên
        bindButtons();

        // Nạp Database bất đồng bộ ở tầng dưới
        try {
            await Persistence.init();
            await ProjectLifecycle.checkDraft();
            console.log("[TGS Platform Genesis 2.0] Offline Database sẵn sàng.");
        } catch (err) {
            console.error("[TGS Platform Genesis 2.0] Cảnh báo Database:", err);
        }
    }

    return { initializeApp };
})();

// Khởi chạy khi DOM hoàn tất nạp
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TGS.initializeApp);
} else {
    TGS.initializeApp();
}
