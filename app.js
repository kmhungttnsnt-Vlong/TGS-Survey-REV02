/* =========================================================
   TGS PLATFORM GENESIS 2.0
   BASELINE B5 — APP.JS (FIELD OPTIMIZED REV05)
   DOCUMENT ID: TGS-HO-301 REV01 COMPLIANT
========================================================= */

const TGS = (() => {

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
       TIỆN ÍCH CHIA SẺ VÀ TẢI VỀ
    ===================================================== */
    async function shareOrDownloadFile(file, fallbackFileName) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: file.name,
                    text: `Hồ sơ khảo sát hiện trường TGS: ${file.name}`
                });
                return;
            } catch (err) {
                if (err.name !== 'AbortError') console.warn("[Share API Warning]", err);
                else return;
            }
        }
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = fallbackFileName || file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    /* =====================================================
       GROUP 1: CORE SYSTEM
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
            throw new Error("Data Contract Violation: Không tìm thấy DB.js");
        },
        async getDraftProject() { return DB.getDraftProject(); },
        async createProject(data) { return DB.createProject(data); },
        async saveProject(project) { return DB.saveProject(project); },
        async getAllProjects() { return DB.getAllProjects(); }
    };

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

            A1_State.currentProject.status = "completed";
            A1_State.currentProject.updatedAt = Date.now();
            await A4_Persistence.saveProject(A1_State.currentProject);

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
       GROUP 2: FEATURE 01 — FULLSCREEN GIS LINEAR SURVEY
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

            // Tự động kéo tâm bản đồ về GPS hiện tại của kỹ sư
            setTimeout(() => {
                L3_SmartGNSS.getQuickPosition(pos => {
                    L2_MapEngine.updateLivePosition(pos);
                });
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
                attributionControl: false, // Tinh gọn, ẩn nhãn bản quyền chiếm chỗ
                preferCanvas: true
            }).setView([9.95, 106.34], 16); // Mặc định trung tâm Tây Nam Bộ

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

    const L4_SurveyLineLogic = {
        async captureRoutePoint() {
            if (!A1_State.currentProject) {
                alert("Chưa chọn hồ sơ công trình.");
                return;
            }

            const btnText = document.getElementById("captureBtnText");

            L3_SmartGNSS.collectSmartObservation(
                (current, target) => {
                    btnText.innerText = `⏳ Đang gom GNSS (${current}/${target})...`;
                },
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

                    // Rung nhẹ xác nhận đã chốt điểm
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
       GROUP 3: CAMERA FULLSCREEN, ZOOM & POINT WORKFLOW
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
        currentZoom: 1,
        videoTrack: null,

        async startCamera() {
            try {
                if (this.stream) this.stopCamera();
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
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

        setZoom(zoomLevel) {
            this.currentZoom = zoomLevel;
            // Nếu phần cứng camera hỗ trợ zoom quang/số
            if (this.videoTrack && typeof this.videoTrack.getCapabilities === "function") {
                const capabilities = this.videoTrack.getCapabilities();
                if (capabilities.zoom) {
                    const targetZoom = Math.min(Math.max(zoomLevel, capabilities.zoom.min), capabilities.zoom.max);
                    this.videoTrack.applyConstraints({ advanced: [{ zoom: targetZoom }] })
                        .catch(e => console.warn(e));
                    return;
                }
            }
            // CSS Digital Zoom dự phòng
            const scale = zoomLevel;
            this.videoFS.style.transform = `scale(${scale})`;
            this.videoInline.style.transform = `scale(${scale})`;
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
                try {
                    this.mediaRecorder = new MediaRecorder(this.stream);
                } catch (e) {
                    alert("Trình duyệt không hỗ trợ MediaRecorder.");
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
                fsBadge.innerText = "⚪ ĐÃ GHI VIDEO";
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

            // Watermark thời gian và tọa độ
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

    const P2_PointGNSS = {
        observedPoint: null,

        observePointPosition(onComplete) {
            const btnText = document.getElementById("btnPointGPSText");
            L3_SmartGNSS.collectSmartObservation(
                (current, target) => {
                    btnText.innerText = `⏳ Đang gom GNSS (${current}/${target})...`;
                },
                (evaluated) => {
                    btnText.innerText = "◎ Thu nhận Smart GNSS vị trí";
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

    const P1_StationWorkflow = {
        initUI() {
            if (!A1_State.currentProject) return;

            // Kế thừa Tên, Mã, Địa điểm từ màn hình 1
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
                    video: P4_MediaManager.currentVideoBase64
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
            alert("Đã lưu hồ sơ đối tượng & media hiện trường thành công!");
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
                const hasVideo = it.evidence?.video ? "🎥" : "";
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
       GROUP 4: REVIEW & HẬU KIỂM MEDIA
    ===================================================== */
    const P5_ReviewManager = {
        renderReviewScreen() {
            if (!A1_State.currentProject) return;
            const container = document.getElementById("reviewMediaContainer");
            document.getElementById("reviewProjectName").innerText = A1_State.currentProject.name;
            container.innerHTML = "";

            const features = A1_State.currentProject.pointFeatures || [];
            if (features.length === 0) {
                container.innerHTML = "<p style='color:var(--muted); text-align:center;'>Chưa có đối tượng media nào để xem lại.</p>";
                A2_Navigation.show("reviewMedia");
                return;
            }

            features.forEach((feat, idx) => {
                const card = document.createElement("div");
                card.className = "review-card";
                
                let mediaHtml = "";
                if (feat.evidence?.video) {
                    mediaHtml += `
                        <p style="font-weight:700; margin-top:8px;">🎥 Video thuyết minh hiện trường:</p>
                        <video src="${feat.evidence.video}" controls playsinline></video>
                    `;
                }

                if (feat.evidence?.photos && feat.evidence.photos.length > 0) {
                    mediaHtml += `<p style="font-weight:700; margin-top:12px;">📷 Hình ảnh đính kèm (${feat.evidence.photos.length}):</p><div class="camera-timeline" style="margin-top:6px;">`;
                    feat.evidence.photos.forEach(p => {
                        mediaHtml += `<div class="timeline-photo"><img src="${p.image}"><small>${p.label}</small></div>`;
                    });
                    mediaHtml += `</div>`;
                }

                card.innerHTML = `
                    <h3>${idx + 1}. [${feat.type}] ${feat.section}</h3>
                    <p style="font-size:13px; color:var(--muted); margin:4px 0;">
                        Tọa độ VN-2000: X:${feat.coordinates.vn2000.x} | Y:${feat.coordinates.vn2000.y} (±${feat.coordinates.accuracy}m)
                    </p>
                    <p style="font-size:13px; color:#334155;"><strong>Hiện trạng:</strong> ${feat.note || "Theo nội dung thuyết minh trong video"}</p>
                    ${mediaHtml}
                `;
                container.appendChild(card);
            });

            A2_Navigation.show("reviewMedia");
        }
    };

    /* =====================================================
       GROUP 5: Z1 BOOTSTRAP & GLOBAL EVENT ASSEMBLER
    ===================================================== */
    const Z1_AppInitialize = {
        bindGlobalEvents() {
            EventBus.on("screen:leave", ({ from }) => {
                if (from === "screenPoint") P3_CameraSession.stopCamera();
            });

            EventBus.on("screen:enter", ({ screen }) => {
                if (screen === "linear") setTimeout(() => L2_MapEngine.invalidate(), 200);
            });

            // Navigation
            document.getElementById("btnStart").addEventListener("click", () => A2_Navigation.show("projectHome"));
            document.getElementById("btnNewProject").addEventListener("click", () => {
                document.getElementById("projectName").value = "";
                document.getElementById("projectCode").value = "";
                document.getElementById("projectLocation").value = "";
                A2_Navigation.show("project");
            });
            document.getElementById("btnContinueDraft").addEventListener("click", () => {
                if (A1_State.currentProject) A3_ProjectLifecycle.enterSurveyHome();
            });

            // Mở modal danh sách công trình
            document.getElementById("btnOpenProject").addEventListener("click", async () => {
                A1_State.cachedProjects = await A4_Persistence.getAllProjects();
                Z1_AppInitialize.renderProjectList(A1_State.cachedProjects);
                document.getElementById("modalProjectList").classList.remove("hidden");
            });

            document.getElementById("btnCloseProjectList").addEventListener("click", () => {
                document.getElementById("modalProjectList").classList.add("hidden");
            });

            // Thanh tìm kiếm công trình thông minh
            document.getElementById("searchProjectInput").addEventListener("input", (e) => {
                const kw = e.target.value.toLowerCase().trim();
                const filtered = A1_State.cachedProjects.filter(p => 
                    p.name.toLowerCase().includes(kw) || p.code.toLowerCase().includes(kw)
                );
                Z1_AppInitialize.renderProjectList(filtered);
            });

            document.getElementById("btnBackHome").addEventListener("click", async () => {
                await A3_ProjectLifecycle.verifyDraft();
                A2_Navigation.show("projectHome");
            });

            document.getElementById("btnCreateProject").addEventListener("click", () => {
                A3_ProjectLifecycle.createNewProject();
            });

            document.getElementById("btnBackProject").addEventListener("click", async () => {
                await A3_ProjectLifecycle.verifyDraft();
                A2_Navigation.show("projectHome");
            });

            // Survey Routing
            document.getElementById("btnLinearSurvey").addEventListener("click", () => L1_ResumeManager.resumeLinearSession());
            document.getElementById("btnPointSurvey").addEventListener("click", () => {
                if (A1_State.currentProject) {
                    A1_State.currentProject.surveyType = "point";
                    A4_Persistence.saveProject(A1_State.currentProject);
                    P1_StationWorkflow.initUI();
                }
                A2_Navigation.show("point");
            });
            document.getElementById("btnReviewMedia").addEventListener("click", () => P5_ReviewManager.renderReviewScreen());
            document.getElementById("btnFinishProject").addEventListener("click", () => A3_ProjectLifecycle.openCompleteSummary());

            document.getElementById("btnBackFromComplete").addEventListener("click", () => A3_ProjectLifecycle.enterSurveyHome());
            document.getElementById("btnBackFromReview").addEventListener("click", () => A3_ProjectLifecycle.enterSurveyHome());
            document.getElementById("btnExitLinear").addEventListener("click", () => A3_ProjectLifecycle.enterSurveyHome());
            document.getElementById("btnExitPoint").addEventListener("click", () => A3_ProjectLifecycle.enterSurveyHome());

            // Linear Survey Tools
            document.getElementById("btnZoomIn").addEventListener("click", () => L2_MapEngine.zoomIn());
            document.getElementById("btnZoomOut").addEventListener("click", () => L2_MapEngine.zoomOut());
            document.getElementById("btnLocate").addEventListener("click", () => {
                L3_SmartGNSS.getQuickPosition(pos => L2_MapEngine.updateLivePosition(pos));
            });
            document.getElementById("btnCaptureGPS").addEventListener("click", () => L4_SurveyLineLogic.captureRoutePoint());
            document.getElementById("btnToggleLayers").addEventListener("click", () => {
                document.getElementById("layerPopupCard").classList.toggle("hidden");
            });

            // Point Survey & GNSS
            document.getElementById("btnGetPointGPS").addEventListener("click", () => P2_PointGNSS.observePointPosition());
            document.getElementById("btnSavePointItem").addEventListener("click", () => P1_StationWorkflow.saveStationRecord());

            // Camera Inline Controls
            document.getElementById("btnToggleCamera").addEventListener("click", () => {
                if (P3_CameraSession.stream) P3_CameraSession.stopCamera();
                else P3_CameraSession.startCamera();
            });
            document.getElementById("btnRecordVideo").addEventListener("click", () => {
                P3_CameraSession.toggleRecord(videoBase64 => P4_MediaManager.setVideo(videoBase64));
            });
            document.getElementById("btnSnapPhoto").addEventListener("click", () => {
                const timeStr = new Date().toLocaleTimeString("vi-VN");
                const overlay = P2_PointGNSS.observedPoint
                    ? `TGS | ${timeStr} | VN2000: X:${P2_PointGNSS.observedPoint.vn2000.x} Y:${P2_PointGNSS.observedPoint.vn2000.y}`
                    : `TGS | ${timeStr} | WGS84 Live`;
                const snap = P3_CameraSession.takeSnapshot(overlay);
                if (snap) P4_MediaManager.addPhoto(snap, timeStr);
            });

            // Fullscreen Camera Controls & Zoom
            const fsOverlay = document.getElementById("fullscreenCameraOverlay");
            document.getElementById("btnOpenFullscreenCam").addEventListener("click", async () => {
                if (!P3_CameraSession.stream) await P3_CameraSession.startCamera();
                fsOverlay.classList.remove("hidden");
            });
            document.getElementById("btnCloseFullscreenCam").addEventListener("click", () => {
                fsOverlay.classList.add("hidden");
            });

            document.querySelectorAll(".zoom-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    document.querySelectorAll(".zoom-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    const z = parseFloat(btn.getAttribute("data-zoom"));
                    P3_CameraSession.setZoom(z);
                });
            });

            document.getElementById("btnRecordVideoFS").addEventListener("click", () => {
                P3_CameraSession.toggleRecord(videoBase64 => P4_MediaManager.setVideo(videoBase64));
            });
            document.getElementById("btnSnapPhotoFS").addEventListener("click", () => {
                const timeStr = new Date().toLocaleTimeString("vi-VN");
                const overlay = P2_PointGNSS.observedPoint
                    ? `TGS | ${timeStr} | VN2000: X:${P2_PointGNSS.observedPoint.vn2000.x} Y:${P2_PointGNSS.observedPoint.vn2000.y}`
                    : `TGS | ${timeStr} | WGS84 Live`;
                const snap = P3_CameraSession.takeSnapshot(overlay);
                if (snap) P4_MediaManager.addPhoto(snap, timeStr);
                if (navigator.vibrate) navigator.vibrate(80);
            });

            // Export & Share API
            document.getElementById("btnExportJSON").addEventListener("click", async () => {
                if (!A1_State.currentProject) return;
                A1_State.currentProject.status = "completed";
                A1_State.currentProject.updatedAt = Date.now();
                await A4_Persistence.saveProject(A1_State.currentProject);

                const dataset = {
                    contract: "TGS-HO-301 REV01",
                    platform: "TGS Platform Genesis 2.0",
                    exportedAt: new Date().toISOString(),
                    project: A1_State.currentProject,
                    linearSurvey: {
                        lineSummary: L4_SurveyLineLogic.getSummary(),
                        points: A1_State.currentProject.points || []
                    },
                    pointSurvey: {
                        stationCount: (A1_State.currentProject.pointFeatures || []).length,
                        features: A1_State.currentProject.pointFeatures || []
                    }
                };

                const fileName = `TGS_DATASET_${A1_State.currentProject.code}_${Date.now()}.json`;
                const jsonBlob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
                const jsonFile = new File([jsonBlob], fileName, { type: "application/json" });
                await shareOrDownloadFile(jsonFile, fileName);
            });

            document.getElementById("btnShareVideos").addEventListener("click", async () => {
                if (!A1_State.currentProject) return;
                const stations = A1_State.currentProject.pointFeatures || [];
                let sharedCount = 0;

                for (let idx = 0; idx < stations.length; idx++) {
                    const videoBase64 = stations[idx].evidence?.video;
                    if (videoBase64) {
                        const res = await fetch(videoBase64);
                        const blob = await res.blob();
                        const fileName = `VIDEO_${A1_State.currentProject.code}_${idx + 1}.webm`;
                        const file = new File([blob], fileName, { type: "video/webm" });
                        await shareOrDownloadFile(file, fileName);
                        sharedCount++;
                    }
                }

                if (sharedCount === 0) alert("Không tìm thấy video nào được lưu.");
            });
        },

        renderProjectList(list) {
            const container = document.getElementById("projectListItems");
            container.innerHTML = "";

            if (list.length === 0) {
                container.innerHTML = "<p style='color:var(--muted); text-align:center;'>Không tìm thấy công trình phù hợp.</p>";
                return;
            }

            list.forEach(proj => {
                const item = document.createElement("div");
                item.className = "project-item-card";
                const dateStr = new Date(proj.updatedAt || proj.createdAt).toLocaleString("vi-VN");
                const statusText = proj.status === "completed" ? "Đã xong" : "Bản nháp";
                const statusClass = proj.status === "completed" ? "completed" : "draft";

                item.innerHTML = `
                    <div>
                        <strong>${proj.name} (${proj.code})</strong>
                        <span style="font-size:12px; color:var(--muted);">${dateStr} · ${proj.location || "Chưa có địa điểm"}</span>
                    </div>
                    <span class="badge-status ${statusClass}">${statusText}</span>
                `;

                item.addEventListener("click", () => {
                    A1_State.currentProject = proj;
                    document.getElementById("modalProjectList").classList.add("hidden");
                    A3_ProjectLifecycle.enterSurveyHome();
                });

                container.appendChild(item);
            });
        },

        async startup() {
            this.bindGlobalEvents();
            try {
                await A4_Persistence.init();
                await A3_ProjectLifecycle.verifyDraft();
            } catch (err) {
                console.error("Lỗi khởi tạo hệ thống:", err);
            }
        }
    };

    return {
        initialize: () => Z1_AppInitialize.startup()
    };
})();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", TGS.initialize);
} else {
    TGS.initialize();
}
