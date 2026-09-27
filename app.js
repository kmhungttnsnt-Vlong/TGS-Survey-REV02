/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B4 — APP.JS (FULL BUGFIX REV03 + CAMERA & MEDIA)
   MODULES:
     - A1 Core Bootstrap & State
     - A2 Navigation Engine
     - A3 Project Lifecycle
     - A4 Persistence Gateway
     - L1 Resume Manager
     - L2 MapEngine (GIS Core)
     - L3 GPSManager (Smart GNSS - 20 Samples Weighted)
     - L4 Survey Line Logic
     - L5 GIS Layer Engine
     - P1 Station Workflow & P2 Point GPS
     - P3 Camera & Video Session (getUserMedia + MediaRecorder)
     - P4 Media Manager (Photos & Logical Video)
     - P6 Sync Builder & Dataset Export
     - Z1 Initialize (Bootstrap Assembler)
========================================================= */

const TGS = (() => {

    /* =====================================================
       COORDINATE TRANSFORMATION SERVICE (VN-2000)
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
                y: Number(y.toFixed(3))
            };
        }
    };

    /* =====================================================
       A1: STATE
    ===================================================== */
    const State = {
        currentProject: null,
        lastPosition: null,
        tempStationGPS: null,
        isSampling: false,
        // Media State (P3/P4)
        cameraStream: null,
        mediaRecorder: null,
        isRecording: false,
        recSeconds: 0,
        recTimer: null,
        currentStationPhotos: [],
        currentStationVideo: null
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
            // Khi rời màn hình khảo sát điểm, tự động tắt camera nếu đang mở
            if (screenKey !== "point") {
                CameraEngine.stopCamera();
            }

            Object.values(Navigation.screens).forEach(scr => {
                if (scr) scr.classList.remove("active");
            });

            const target = Navigation.screens[screenKey];
            if (target) {
                target.classList.add("active");
            }

            if (screenKey === "linear") {
                setTimeout(() => MapEngine.invalidate(), 150);
            }
        }
    };

    /* =====================================================
       A4: PERSISTENCE GATEWAY
    ===================================================== */
    const Persistence = {
        async init() { return DB.init(); },
        async getDraft() { return DB.getDraftProject(); },
        async save(project) { return DB.saveProject(project); },
        async create(data) { return DB.createProject(data); },
        async getAll() { return DB.getAllProjects(); }
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
                console.warn("[ProjectLifecycle] checkDraft:", err);
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

            try {
                const project = await Persistence.create({ name, code, location });
                State.currentProject = project;
                await ProjectLifecycle.checkDraft();
                ProjectLifecycle.enterSurveyHome();
            } catch (err) {
                console.error("Lỗi tạo dự án:", err);
                alert("Không thể tạo công trình: " + err.message);
            }
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
            document.getElementById("completeProjectSummary").innerText = `Mã: ${State.currentProject.code} | Địa điểm: ${State.currentProject.location || "Chưa rõ"}`;

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
       L2 & L5: MAP ENGINE (GIS)
    ===================================================== */
    const MapEngine = {
        map: null,
        lineLayer: null,
        markerLayer: null,
        currentGPSMarker: null,
        accuracyCircle: null,

        init() {
            const mapContainer = document.getElementById("map");
            if (!mapContainer) return;

            if (MapEngine.map) {
                MapEngine.map.remove();
                MapEngine.map = null;
            }

            MapEngine.map = L.map("map", { 
                zoomControl: false,
                preferCanvas: true
            }).setView([10.762622, 106.660172], 16);

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
            }
            if (MapEngine.map) {
                MapEngine.map.invalidateSize();
                MapEngine.renderSurveyData();
            }
        },

        renderSurveyData() {
            if (!State.currentProject || !MapEngine.map) return;
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
       L3: SMART GNSS ENGINE (20 SAMPLES POLLING)
    ===================================================== */
    const GPSManager = {
        sampleTarget: 20,

        quickLocate() {
            if (!navigator.geolocation) {
                alert("Trình duyệt không hỗ trợ Geolocation.");
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
                },
                err => {
                    gpsText.innerText = "Mất tín hiệu";
                    alert("Lỗi GPS: " + err.message);
                },
                { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
            );
        },

        startSmartGPS(progressCallback, completeCallback) {
            if (State.isSampling) return;
            if (!navigator.geolocation) {
                alert("Thiết bị không hỗ trợ Geolocation.");
                return;
            }

            State.isSampling = true;
            const samples = [];
            const L0 = State.currentProject?.meta?.centralMeridian || 105.5;

            const samplingInterval = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        const { latitude, longitude, accuracy } = pos.coords;
                        samples.push({ lat: latitude, lng: longitude, accuracy });

                        if (typeof progressCallback === "function") {
                            progressCallback(samples.length, GPSManager.sampleTarget);
                        }

                        if (samples.length >= GPSManager.sampleTarget) {
                            clearInterval(samplingInterval);
                            State.isSampling = false;

                            let sumW = 0, sumLat = 0, sumLng = 0, minAcc = Infinity;
                            samples.forEach(s => {
                                const w = 1 / Math.max(s.accuracy * s.accuracy, 1);
                                sumW += w;
                                sumLat += s.lat * w;
                                sumLng += s.lng * w;
                                if (s.accuracy < minAcc) minAcc = s.accuracy;
                            });

                            const finalLat = sumLat / sumW;
                            const finalLng = sumLng / sumW;
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

                            document.getElementById("gpsText").innerText = "Smart GNSS (20/20)";
                            document.getElementById("gpsAccuracy").innerText = `± ${finalAcc} m`;
                            document.getElementById("vn2000Text").innerText = `${finalVN2000.x.toFixed(1)}, ${finalVN2000.y.toFixed(1)}`;

                            if (typeof completeCallback === "function") {
                                completeCallback(representative);
                            }
                        }
                    },
                    err => console.warn("Mẫu GPS:", err.message),
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
                );
            }, 350);
        }
    };

    /* =====================================================
       L4: SURVEY LINE LOGIC
    ===================================================== */
    const SurveyLineLogic = {
        async triggerSmartCapture() {
            if (!State.currentProject) {
                alert("Chưa chọn hồ sơ công trình.");
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
       P3 & P4: CAMERA & MEDIA ENGINE (FEATURE 02)
    ===================================================== */
    const CameraEngine = {
        videoEl: document.getElementById("cameraPreview"),
        timelineEl: document.getElementById("cameraTimeline"),
        recBadge: document.getElementById("cameraRecBadge"),

        async startCamera() {
            try {
                if (State.cameraStream) {
                    CameraEngine.stopCamera();
                }

                // Yêu cầu camera sau (environment) kèm mic nếu quay video
                State.cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: true
                });

                CameraEngine.videoEl.srcObject = State.cameraStream;
                document.getElementById("btnToggleCamera").innerText = "Đóng Camera";
                CameraEngine.recBadge.innerText = "⚪ SẴN SÀNG";
            } catch (err) {
                console.error("Lỗi Camera:", err);
                alert("Không thể mở Camera: " + err.message + "\nHãy kiểm tra quyền truy cập Camera trên trình duyệt.");
            }
        },

        stopCamera() {
            if (State.cameraStream) {
                State.cameraStream.getTracks().forEach(track => track.stop());
                State.cameraStream = null;
            }
            if (CameraEngine.videoEl) {
                CameraEngine.videoEl.srcObject = null;
            }
            const btn = document.getElementById("btnToggleCamera");
            if (btn) btn.innerText = "Mở Camera";
            if (CameraEngine.recBadge) CameraEngine.recBadge.innerText = "⚪ TẮT";
        },

        toggleCamera() {
            if (State.cameraStream) {
                CameraEngine.stopCamera();
            } else {
                CameraEngine.startCamera();
            }
        },

        formatTime(sec) {
            const m = Math.floor(sec / 60).toString().padStart(2, "0");
            const s = (sec % 60).toString().padStart(2, "0");
            return `${m}:${s}`;
        },

        toggleRecord() {
            if (!State.cameraStream) {
                alert("Vui lòng nhấn 'Mở Camera' trước khi quay video.");
                return;
            }

            const recBtn = document.getElementById("btnRecordVideo");

            if (!State.isRecording) {
                const chunks = [];
                try {
                    State.mediaRecorder = new MediaRecorder(State.cameraStream);
                } catch (e) {
                    alert("Trình duyệt không hỗ trợ MediaRecorder video/webm.");
                    return;
                }

                State.mediaRecorder.ondataavailable = e => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                State.mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: "video/webm" });
                    // Đọc blob thành Base64 Data URL để lưu vào IndexedDB
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        State.currentStationVideo = reader.result;
                        document.getElementById("videoRecordedNotice").classList.remove("hidden");
                    };
                    reader.readAsDataURL(blob);
                };

                State.mediaRecorder.start();
                State.isRecording = true;
                State.recSeconds = 0;

                recBtn.innerText = "⏹ Dừng REC";
                CameraEngine.recBadge.classList.add("recording");
                CameraEngine.recBadge.innerText = "🔴 REC 00:00";

                State.recTimer = setInterval(() => {
                    State.recSeconds++;
                    CameraEngine.recBadge.innerText = `🔴 REC ${CameraEngine.formatTime(State.recSeconds)}`;
                }, 1000);

            } else {
                // Dừng quay
                State.mediaRecorder.stop();
                State.isRecording = false;
                clearInterval(State.recTimer);

                recBtn.innerText = "🔴 Quay Video";
                CameraEngine.recBadge.classList.remove("recording");
                CameraEngine.recBadge.innerText = `⚪ ĐÃ QUAY (${CameraEngine.formatTime(State.recSeconds)})`;
            }
        },

        capturePhoto() {
            if (!State.cameraStream) {
                alert("Vui lòng nhấn 'Mở Camera' trước khi chụp ảnh.");
                return;
            }

            const v = CameraEngine.videoEl;
            const canvas = document.createElement("canvas");
            canvas.width = v.videoWidth || 1280;
            canvas.height = v.videoHeight || 720;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

            // Watermark tọa độ trực tiếp lên ảnh
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "20px Arial";
            const timeStr = new Date().toLocaleTimeString("vi-VN");
            const coordStr = State.tempStationGPS 
                ? `VN2000: X:${State.tempStationGPS.vn2000.x} Y:${State.tempStationGPS.vn2000.y}` 
                : "GPS: Chưa khóa";
            ctx.fillText(`TGS SURVEY | ${timeStr} | ${coordStr}`, 20, canvas.height - 18);

            const imgBase64 = canvas.toDataURL("image/jpeg", 0.85);

            State.currentStationPhotos.unshift({
                id: Date.now().toString(),
                time: timeStr,
                image: imgBase64
            });

            CameraEngine.renderTimeline();
        },

        renderTimeline() {
            CameraEngine.timelineEl.innerHTML = "";
            document.getElementById("photoCount").innerText = State.currentStationPhotos.length;

            if (State.currentStationPhotos.length === 0) {
                CameraEngine.timelineEl.innerHTML = "<p style='color:var(--muted); font-size:12px; grid-column:1/-1; text-align:center;'>Chưa có ảnh chụp</p>";
                return;
            }

            State.currentStationPhotos.forEach(p => {
                const div = document.createElement("div");
                div.className = "timeline-photo";
                div.innerHTML = `
                    <img src="${p.image}">
                    <small>${p.time}</small>
                `;
                CameraEngine.timelineEl.appendChild(div);
            });
        },

        previewVideo() {
            if (!State.currentStationVideo) return;
            const win = window.open("");
            win.document.write(`<video src="${State.currentStationVideo}" controls autoplay style="width:100%; height:100%; background:#000;"></video>`);
        }
    };

    /* =====================================================
       P1 & P2: POINT SURVEY
    ===================================================== */
    const PointSurvey = {
        initUI() {
            if (!State.currentProject) return;
            document.getElementById("pointProjectTitle").innerText = State.currentProject.name;
            document.getElementById("pointProjectSubtitle").innerText = `Mã: ${State.currentProject.code}`;
            
            // Reset form & media
            State.currentStationPhotos = [];
            State.currentStationVideo = null;
            State.tempStationGPS = null;
            document.getElementById("videoRecordedNotice").classList.add("hidden");
            CameraEngine.renderTimeline();
            PointSurvey.renderList();
        },

        getStationGPS() {
            const btnText = document.getElementById("btnPointGPSText");

            GPSManager.startSmartGPS(
                (current, target) => {
                    btnText.innerText = `Đang gom (${current}/${target})...`;
                },
                (representative) => {
                    btnText.innerText = "◎ Thu nhận Smart GNSS trạm";
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
            const section = document.getElementById("pointSectionInput").value.trim();
            const note = document.getElementById("pointNoteInput").value.trim();

            if (!name) {
                alert("Vui lòng nhập tên hoặc ký hiệu trạm.");
                return;
            }

            if (!State.tempStationGPS) {
                alert("Vui lòng bấm 'Thu nhận Smart GNSS trạm' (đủ 20 mẫu) trước khi lưu.");
                return;
            }

            const item = {
                id: Date.now().toString(),
                type,
                name,
                section,
                note,
                lat: State.tempStationGPS.lat,
                lng: State.tempStationGPS.lng,
                accuracy: State.tempStationGPS.accuracy,
                vn2000: State.tempStationGPS.vn2000,
                photos: [...State.currentStationPhotos],
                video: State.currentStationVideo || null,
                timestamp: Date.now()
            };

            if (!State.currentProject.pointFeatures) State.currentProject.pointFeatures = [];
            State.currentProject.pointFeatures.push(item);

            await Persistence.save(State.currentProject);

            // Tắt camera và dọn sạch form
            CameraEngine.stopCamera();
            document.getElementById("pointNameInput").value = "";
            document.getElementById("pointSectionInput").value = "";
            document.getElementById("pointNoteInput").value = "";
            document.getElementById("pointWGS84Text").innerText = "Chưa thu nhận";
            document.getElementById("pointVN2000Text").innerText = "Chưa chuyển";
            document.getElementById("pointAccuracyText").innerText = "± -- m";
            document.getElementById("videoRecordedNotice").classList.add("hidden");

            State.tempStationGPS = null;
            State.currentStationPhotos = [];
            State.currentStationVideo = null;
            CameraEngine.renderTimeline();

            PointSurvey.renderList();
            alert("Đã lưu hồ sơ trạm, tọa độ và hình ảnh/video thành công!");
        },

        renderList() {
            const list = document.getElementById("savedPointsList");
            const count = document.getElementById("savedPointsCount");
            const items = State.currentProject?.pointFeatures || [];

            count.innerText = items.length;
            list.innerHTML = "";

            if (items.length === 0) {
                list.innerHTML = "<p style='color:var(--muted);font-size:13px;'>Chưa có trạm nào được ghi nhận.</p>";
                return;
            }

            items.forEach((it, idx) => {
                const photoNum = it.photos ? it.photos.length : 0;
                const hasVideo = it.video ? "🎥" : "";
                const row = document.createElement("div");
                row.className = "saved-point-item";
                row.innerHTML = `
                    <div>
                        <strong>${idx + 1}. ${it.name} (${it.type})</strong>
                        <span>VN2000: X:${it.vn2000.x} | Y:${it.vn2000.y} · 📷 ${photoNum} ảnh ${hasVideo}</span>
                    </div>
                    <span style="color:var(--primary); font-weight:700;">✓</span>
                `;
                list.appendChild(row);
            });
        }
    };

    /* =====================================================
       P6: SYNC BUILDER & EXPORT
    ===================================================== */
    const SyncBuilder = {
        exportJSON() {
            if (!State.currentProject) {
                alert("Không có dữ liệu.");
                return;
            }

            const dataset = {
                metadata: {
                    platform: "TGS Platform Genesis 2.0",
                    baseline: "TGS-HO-301 REV01",
                    exportTime: new Date().toISOString()
                },
                project: State.currentProject
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
            const downloadAnchor = document.createElement("a");
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `TGS_DATASET_${State.currentProject.code}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }
    };

    /* =====================================================
       Z1: APP INITIALIZE & BINDINGS
    ===================================================== */
    function bindButtons() {
        // 1. Splash -> Project Home
        document.getElementById("btnStart").addEventListener("click", () => {
            Navigation.show("projectHome");
        });

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
                alert("Chưa có công trình nào trong cơ sở dữ liệu.");
                return;
            }
            State.currentProject = list[0];
            ProjectLifecycle.enterSurveyHome();
        });

        // 3. Project Form
        document.getElementById("btnBackHome").addEventListener("click", () => {
            ProjectLifecycle.checkDraft();
            Navigation.show("projectHome");
        });
        document.getElementById("btnCreateProject").addEventListener("click", ProjectLifecycle.handleCreate);

        // 4. Survey Home
        document.getElementById("btnBackProject").addEventListener("click", () => {
            ProjectLifecycle.checkDraft();
            Navigation.show("projectHome");
        });

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

        // Back buttons
        document.getElementById("btnExitLinear").addEventListener("click", () => Navigation.show("surveyHome"));
        document.getElementById("btnExitPoint").addEventListener("click", () => Navigation.show("surveyHome"));

        // Map controls
        document.getElementById("btnZoomIn").addEventListener("click", MapEngine.zoomIn);
        document.getElementById("btnZoomOut").addEventListener("click", MapEngine.zoomOut);
        document.getElementById("btnLocate").addEventListener("click", GPSManager.quickLocate);
        document.getElementById("btnCaptureGPS").addEventListener("click", SurveyLineLogic.triggerSmartCapture);

        // Point Survey & Camera controls
        document.getElementById("btnGetPointGPS").addEventListener("click", PointSurvey.getStationGPS);
        document.getElementById("btnSavePointItem").addEventListener("click", PointSurvey.saveStation);
        document.getElementById("btnToggleCamera").addEventListener("click", CameraEngine.toggleCamera);
        document.getElementById("btnRecordVideo").addEventListener("click", CameraEngine.toggleRecord);
        document.getElementById("btnSnapPhoto").addEventListener("click", CameraEngine.capturePhoto);
        document.getElementById("btnPreviewVideo").addEventListener("click", CameraEngine.previewVideo);
    }

    async function initializeApp() {
        console.log("[TGS Platform Genesis 2.0] Khởi động...");
        bindButtons();

        try {
            await Persistence.init();
            await ProjectLifecycle.checkDraft();
            console.log("[TGS Platform Genesis 2.0] Sẵn sàng hoạt động.");
        } catch (err) {
            console.error("[TGS Platform Genesis 2.0] Lỗi khởi tạo DB:", err);
        }
    }

    return { initializeApp };
})();

// Khởi chạy khi DOM sẵn sàng
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TGS.initializeApp);
} else {
    TGS.initializeApp();
}
