/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B4 — APP.JS (FULL INTEGRATION)
   ROUTER + GIS + LEAFLET + DB + VN2000
========================================================= */

const APP = (() => {

    /* =====================================================
       1. STATE MANAGEMENT
    ===================================================== */
    const state = {
        currentProject: null,
        lastKnownGPS: null,
        lastKnownVN2000: null,
        mapInstance: null,
        currentGPSMarker: null,
        surveyPolyline: null,
        markersLayer: null,
        // Mặc định kinh tuyến trục L0 (ví dụ: 105.0, 105.5, hoặc 105.75 tuỳ khu vực)
        defaultMeridian: 105.5 
    };

    /* =====================================================
       2. DOM ELEMENTS & ROUTER
    ===================================================== */
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

        // Tự động căn chỉnh kích thước Leaflet Map khi mở màn hình khảo sát tuyến
        if (screenKey === "linear") {
            setTimeout(() => {
                GIS.invalidateMap();
            }, 250);
        }
    }

    /* =====================================================
       3. GIS & LEAFLET MAP CONTROLLER
    ===================================================== */
    const GIS = {
        initMap() {
            if (state.mapInstance) return;

            // Tọa độ khởi tạo mặc định (Việt Nam)
            const initialCoords = [10.762622, 106.660172];

            state.mapInstance = L.map("map", {
                zoomControl: false // Sử dụng nút zoom tuỳ chỉnh trên thanh công cụ
            }).setView(initialCoords, 16);

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

                // Tính hoặc lấy tọa độ VN2000 đã lưu
                const vnCoord = pt.vn2000 || (typeof VN2000 !== "undefined" 
                    ? VN2000.forward(pt.lat, pt.lng, state.defaultMeridian) 
                    : null);

                const popupContent = `
                    <div style="font-size:13px; line-height:1.4;">
                        <strong>Điểm ${index + 1}</strong><br>
                        ${vnCoord ? `X (Bắc): <b>${vnCoord.x.toFixed(2)}</b> m<br>Y (Đông): <b>${vnCoord.y.toFixed(2)}</b> m<br>` : ""}
                        WGS84: ${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}
                    </div>
                `;

                L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: "#2E7D32",
                    color: "#FFFFFF",
                    weight: 2,
                    fillOpacity: 1
                }).bindPopup(popupContent).addTo(state.markersLayer);
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

            // Tính tổng chiều dài tuyến khảo sát
            let totalDist = 0;
            for (let i = 1; i < points.length; i++) {
                const p1 = L.latLng(points[i - 1].lat, points[i - 1].lng);
                const p2 = L.latLng(points[i].lat, points[i].lng);
                totalDist += p1.distanceTo(p2);
            }

            document.getElementById("lineLength").innerText = totalDist >= 1000
                ? `${(totalDist / 1000).toFixed(2)} km`
                : `${Math.round(totalDist)} m`;

            // Cập nhật nhãn tọa độ VN-2000 ở Footer
            if (points.length > 0) {
                const lastPt = points[points.length - 1];
                const vn = lastPt.vn2000 || (typeof VN2000 !== "undefined" 
                    ? VN2000.forward(lastPt.lat, lastPt.lng, state.defaultMeridian) 
                    : null);

                if (vn) {
                    document.getElementById("vn2000Text").innerText = `${vn.x.toFixed(1)}, ${vn.y.toFixed(1)}`;
                } else {
                    document.getElementById("vn2000Text").innerText = `${lastPt.lat.toFixed(5)}, ${lastPt.lng.toFixed(5)}`;
                }
            } else if (state.lastKnownVN2000) {
                document.getElementById("vn2000Text").innerText = `${state.lastKnownVN2000.x.toFixed(1)}, ${state.lastKnownVN2000.y.toFixed(1)}`;
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
                alert("Thiết bị hoặc trình duyệt không hỗ trợ Geolocation.");
                return;
            }

            const gpsText = document.getElementById("gpsText");
            gpsText.innerText = "Đang định vị...";

            navigator.geolocation.getCurrentPosition(
                pos => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    state.lastKnownGPS = { lat: latitude, lng: longitude, accuracy };

                    // Chuyển đổi sang VN2000 ngay khi có tọa độ WGS84
                    if (typeof VN2000 !== "undefined") {
                        state.lastKnownVN2000 = VN2000.forward(latitude, longitude, state.defaultMeridian);
                        document.getElementById("vn2000Text").innerText = `${state.lastKnownVN2000.x.toFixed(1)}, ${state.lastKnownVN2000.y.toFixed(1)}`;
                    }

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
                    alert("Không thể lấy tín hiệu GPS: " + err.message);
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
                alert("Chưa có hồ sơ công trình nào đang được mở.");
                return;
            }

            // Chuyển đổi sang VN2000
            let vn2000Data = null;
            if (typeof VN2000 !== "undefined") {
                vn2000Data = VN2000.forward(state.lastKnownGPS.lat, state.lastKnownGPS.lng, state.defaultMeridian);
            }

            const newPoint = {
                id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
                lat: state.lastKnownGPS.lat,
                lng: state.lastKnownGPS.lng,
                accuracy: state.lastKnownGPS.accuracy,
                vn2000: vn2000Data,
                timestamp: Date.now()
            };

            if (!state.currentProject.points) state.currentProject.points = [];
            state.currentProject.points.push(newPoint);

            // Lưu trạng thái vào IndexedDB
            await DB.save(state.currentProject);

            // Vẽ điểm mới lên bản đồ
            const latlng = [newPoint.lat, newPoint.lng];
            const pointIndex = state.currentProject.points.length;

            const popupContent = `
                <div style="font-size:13px; line-height:1.4;">
                    <strong>Điểm ${pointIndex}</strong><br>
                    ${vn2000Data ? `X: <b>${vn2000Data.x.toFixed(2)}</b> m<br>Y: <b>${vn2000Data.y.toFixed(2)}</b> m<br>` : ""}
                    WGS84: ${newPoint.lat.toFixed(6)}, ${newPoint.lng.toFixed(6)}
                </div>
            `;

            L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#2E7D32",
                color: "#FFFFFF",
                weight: 2,
                fillOpacity: 1
            }).bindPopup(popupContent).addTo(state.markersLayer);

            state.surveyPolyline.addLatLng(latlng);
            GIS.updateMetrics();
        }
    };

    /* =====================================================
       4. EVENT BINDINGS
    ===================================================== */
    function bindEvents() {
        // Splash -> Project Home
        document.getElementById("btnStart").addEventListener("click", () => {
            navigateTo("projectHome");
        });

        // Project Home: Tạo mới công trình
        document.getElementById("btnNewProject").addEventListener("click", () => {
            document.getElementById("projectName").value = "";
            document.getElementById("projectCode").value = "";
            document.getElementById("projectLocation").value = "";
            navigateTo("project");
        });

        // Project Home: Tiếp tục công trình nháp
        document.getElementById("btnContinueDraft").addEventListener("click", () => {
            if (state.currentProject) {
                openSurveyHome(state.currentProject);
            }
        });

        // Project Home: Mở công trình đã lưu
        document.getElementById("btnOpenProject").addEventListener("click", async () => {
            const list = await DB.getAll();
            if (list.length === 0) {
                alert("Chưa có công trình nào được lưu.");
                return;
            }
            state.currentProject = list[0];
            openSurveyHome(state.currentProject);
        });

        // Project Form: Quay lại
        document.getElementById("btnBackHome").addEventListener("click", () => {
            navigateTo("projectHome");
        });

        // Project Form: Lưu công trình
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

        // Survey Home: Chọn loại khảo sát
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

        // Thoát khỏi khảo sát -> Quay về Survey Home
        document.getElementById("btnExitLinear").addEventListener("click", () => {
            navigateTo("surveyHome");
        });

        document.getElementById("btnExitPoint").addEventListener("click", () => {
            navigateTo("surveyHome");
        });

        // Thao tác bản đồ & GPS
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

    /* =====================================================
       5. INITIALIZE APPLICATION
    ===================================================== */
    async function init() {
        try {
            await DB.init();
            await refreshDraftBanner();
            bindEvents();
            console.log("TGS Platform Genesis 2.0: Khởi chạy hoàn tất.");
        } catch (error) {
            console.error("Lỗi khi khởi động ứng dụng:", error);
        }
    }

    return { init };
})();

// Khởi chạy khi tài liệu DOM sẵn sàng
document.addEventListener("DOMContentLoaded", APP.init);
/* =====================================================
       5. INITIALIZE APPLICATION (BẢN SỬA LỖI)
    ===================================================== */
    async function init() {
        // 1. Luôn gán sự kiện cho các nút bấm TRƯỚC TIÊN
        // Đảm bảo nút Bắt đầu, chuyển màn hình luôn chạy được ngay
        bindEvents();

        // 2. Sau đó mới nạp CSDL IndexedDB ngầm
        try {
            if (typeof DB !== "undefined") {
                await DB.init();
                await refreshDraftBanner();
            }
        } catch (error) {
            console.warn("Lưu ý IndexedDB:", error);
        }

        console.log("TGS Platform: Đã kích hoạt hệ thống nút bấm thành công.");
    }

    return { init };
})();

// Khởi chạy khi DOM sẵn sàng
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", APP.init);
} else {
    APP.init();
}
