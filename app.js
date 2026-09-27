/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B4 — APP.JS
   CONTROLLER & UI INTERACTION LAYER
   REV01
========================================================= */

const APP = (() => {

    /* ===========================
       APPLICATION STATE
    =========================== */
    const state = {
        currentProject: null,
        lastKnownGPS: null,
        mapInstance: null,
        currentGPSMarker: null,
        surveyPolyline: null,
        markersLayer: null
    };

    /* ===========================
       ROUTER / SCREEN MANAGER
    =========================== */
    const screens = {
        splash: document.getElementById("screenSplash"),
        projectHome: document.getElementById("screenProjectHome"),
        project: document.getElementById("screenProject"),
        surveyHome: document.getElementById("screenSurveyHome"),
        linear: document.getElementById("screenLinear"),
        point: document.getElementById("screenPoint")
    };

    function navigateTo(screenKey) {
        Object.keys(screens).forEach(key => {
            if (screens[key]) {
                screens[key].classList.remove("active");
            }
        });

        if (screens[screenKey]) {
            screens[screenKey].classList.add("active");
        }

        // Tự động căn chỉnh kích thước Leaflet khi mở khảo sát tuyến
        if (screenKey === "linear") {
            setTimeout(() => {
                GIS.invalidateMap();
            }, 300);
        }
    }

    /* ===========================
       GIS & MAP MODULE
    =========================== */
    const GIS = {
        initMap() {
            if (state.mapInstance) return;

            // Tọa độ mặc định (Việt Nam)
            const defaultCoords = [10.762622, 106.660172];

            state.mapInstance = L.map("map", {
                zoomControl: false
            }).setView(defaultCoords, 16);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
                maxZoom: 19
            }).addTo(state.mapInstance);

            state.markersLayer = L.layerGroup().addTo(state.mapInstance);
            state.surveyPolyline = L.polyline([], {
                color: "#1565C0",
                weight: 4,
                opacity: 0.85
            }).addTo(state.mapInstance);

            GIS.loadProjectData();
        },

        invalidateMap() {
            if (!state.mapInstance) {
                GIS.initMap();
            } else {
                state.mapInstance.invalidateSize();
            }
        },

        loadProjectData() {
            if (!state.currentProject) return;

            state.markersLayer.clearLayers();
            const coordinates = [];

            const points = state.currentProject.points || [];
            points.forEach((pt, index) => {
                const latlng = [pt.lat, pt.lng];
                coordinates.push(latlng);

                L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: "#2E7D32",
                    color: "#FFFFFF",
                    weight: 2,
                    fillOpacity: 1
                }).bindPopup(`<b>Điểm ${index + 1}</b><br>Lat: ${pt.lat.toFixed(6)}<br>Lng: ${pt.lng.toFixed(6)}`)
                  .addTo(state.markersLayer);
            });

            state.surveyPolyline.setLatLngs(coordinates);

            if (coordinates.length > 0) {
                state.mapInstance.fitBounds(state.surveyPolyline.getBounds(), { padding: [40, 40] });
            }

            GIS.updateMetrics();
        },

        updateMetrics() {
            const points = state.currentProject?.points || [];
            document.getElementById("pointCount").innerText = points.length;

            let totalDist = 0;
            for (let i = 1; i < points.length; i++) {
                const p1 = L.latLng(points[i - 1].lat, points[i - 1].lng);
                const p2 = L.latLng(points[i].lat, points[i].lng);
                totalDist += p1.distanceTo(p2);
            }

            document.getElementById("lineLength").innerText = totalDist >= 1000
                ? `${(totalDist / 1000).toFixed(2)} km`
                : `${Math.round(totalDist)} m`;

            if (points.length > 0) {
                const lastPoint = points[points.length - 1];
                document.getElementById("vn2000Text").innerText = `${lastPoint.lat.toFixed(5)}, ${lastPoint.lng.toFixed(5)}`;
            } else {
                document.getElementById("vn2000Text").innerText = "Chưa chuyển";
            }
        },

        zoomIn() {
            if (state.mapInstance) state.mapInstance.zoomIn();
        },

        zoomOut() {
            if (state.mapInstance) state.mapInstance.zoomOut();
        },

        locateCurrentGPS() {
            if (!navigator.geolocation) {
                alert("Thiết bị không hỗ trợ Geolocation.");
                return;
            }

            const gpsText = document.getElementById("gpsText");
            gpsText.innerText = "Đang định vị...";

            navigator.geolocation.getCurrentPosition(
                pos => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    state.lastKnownGPS = { lat: latitude, lng: longitude, accuracy };

                    gpsText.innerText = "Đã khóa vị trí";
                    document.getElementById("gpsAccuracy").innerText = `± ${Math.round(accuracy)} m`;

                    if (state.mapInstance) {
                        state.mapInstance.setView([latitude, longitude], 18);

                        if (!state.currentGPSMarker) {
                            state.currentGPSMarker = L.circleMarker([latitude, longitude], {
                                radius: 8,
                                fillColor: "#1565C0",
                                color: "#FFFFFF",
                                weight: 2,
                                fillOpacity: 1
                            }).addTo(state.mapInstance);
                        } else {
                            state.currentGPSMarker.setLatLng([latitude, longitude]);
                        }
                    }
                },
                err => {
                    gpsText.innerText = "Mất tín hiệu GPS";
                    alert("Lỗi GPS: " + err.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        },

        async acquirePoint() {
            if (!state.lastKnownGPS) {
                GIS.locateCurrentGPS();
                return;
            }

            if (!state.currentProject) {
                alert("Chưa có hồ sơ công trình nào đang mở.");
                return;
            }

            const newPoint = {
                id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
                lat: state.lastKnownGPS.lat,
                lng: state.lastKnownGPS.lng,
                accuracy: state.lastKnownGPS.accuracy,
                timestamp: Date.now()
            };

            if (!state.currentProject.points) state.currentProject.points = [];
            state.currentProject.points.push(newPoint);

            // Lưu dữ liệu vào DB
            await DB.save(state.currentProject);

            // Vẽ ngay lên bản đồ
            const latlng = [newPoint.lat, newPoint.lng];
            L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#2E7D32",
                color: "#FFFFFF",
                weight: 2,
                fillOpacity: 1
            }).bindPopup(`<b>Điểm ${state.currentProject.points.length}</b>`).addTo(state.markersLayer);

            state.surveyPolyline.addLatLng(latlng);
            GIS.updateMetrics();
        }
    };

    /* ===========================
       EVENT LISTENERS BINDING
    =========================== */
    function bindEvents() {
        // Splash -> Project Home
        document.getElementById("btnStart").addEventListener("click", () => {
            navigateTo("projectHome");
        });

        // Project Home Actions
        document.getElementById("btnNewProject").addEventListener("click", () => {
            document.getElementById("projectName").value = "";
            document.getElementById("projectCode").value = "";
            document.getElementById("projectLocation").value = "";
            navigateTo("project");
        });

        document.getElementById("btnContinueDraft").addEventListener("click", () => {
            if (state.currentProject) {
                openSurveyHome(state.currentProject);
            }
        });

        document.getElementById("btnOpenProject").addEventListener("click", async () => {
            const list = await DB.getAll();
            if (list.length === 0) {
                alert("Chưa có công trình nào được lưu.");
                return;
            }
            state.currentProject = list[0];
            openSurveyHome(state.currentProject);
        });

        // Project Form Actions
        document.getElementById("btnBackHome").addEventListener("click", () => {
            navigateTo("projectHome");
        });

        document.getElementById("btnSaveProject").addEventListener("click", async () => {
            const name = document.getElementById("projectName").value.trim();
            const code = document.getElementById("projectCode").value.trim();
            const location = document.getElementById("projectLocation").value.trim();

            if (!name || !code) {
                alert("Vui lòng nhập tên và mã công trình.");
                return;
            }

            try {
                const project = await DB.createProject({ name, code, location });
                state.currentProject = project;
                await refreshDraftBanner();
                openSurveyHome(project);
            } catch (err) {
                console.error("Không thể tạo dự án:", err);
                alert("Lỗi khi lưu dữ liệu vào cơ sở dữ liệu.");
            }
        });

        // Survey Home Actions
        document.getElementById("btnBackProject").addEventListener("click", () => {
            navigateTo("projectHome");
        });

        document.getElementById("btnPointSurvey").addEventListener("click", () => {
            navigateTo("point");
        });

        document.getElementById("btnLinearSurvey").addEventListener("click", () => {
            if (state.currentProject) {
                document.getElementById("linearProjectName").innerText = 
                    `${state.currentProject.name} (${state.currentProject.code})`;
                state.currentProject.surveyType = "linear";
                DB.save(state.currentProject);
            }
            navigateTo("linear");
        });

        // Back from Survey to Survey Home
        document.getElementById("btnExitLinear").addEventListener("click", () => {
            navigateTo("surveyHome");
        });

        document.getElementById("btnExitPoint").addEventListener("click", () => {
            navigateTo("surveyHome");
        });

        // Map Tool Buttons
        document.getElementById("btnZoomIn").addEventListener("click", GIS.zoomIn);
        document.getElementById("btnZoomOut").addEventListener("click", GIS.zoomOut);
        document.getElementById("btnLocate").addEventListener("click", GIS.locateCurrentGPS);
        document.getElementById("btnAcquireGPS").addEventListener("click", GIS.acquirePoint);
    }

    function openSurveyHome(project) {
        document.getElementById("surveyProjectTitle").innerText = project.name || "Công trình";
        navigateTo("surveyHome");
    }

    async function refreshDraftBanner() {
        const draftBanner = document.getElementById("draftBanner");
        const draft = await DB.getDraft();

        if (draft) {
            state.currentProject = draft;
            draftBanner.classList.remove("hidden");
        } else {
            draftBanner.classList.add("hidden");
        }
    }

    /* ===========================
       INITIALIZE APPLICATION
    =========================== */
    async function init() {
        try {
            await DB.init();
            await refreshDraftBanner();
            bindEvents();
            console.log("TGS Platform Genesis 2.0: Sẵn sàng hoạt động.");
        } catch (error) {
            console.error("Khởi động ứng dụng thất bại:", error);
        }
    }

    return { init };
})();

// Khởi chạy khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", APP.init);
