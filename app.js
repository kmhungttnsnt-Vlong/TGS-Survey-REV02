/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   TGS02-WEB-LINEAR-004

   app.js
   REV14 — SMART GNSS ACQUISITION

   PURPOSE
   ----------------------------------------------------------
   1. Reconcile app.js with current index.html.
   2. Reconcile Project Lifecycle with DB v4.
   3. Fix START button failure.
   4. Ensure UI bindings are independent from DB initialization.
   5. Preserve ArcGIS as default map provider.
   6. Implement Smart GNSS acquisition using watchPosition().
   7. Remove all synthetic GIS/demo objects.
   8. Keep GIS layer controls provider-independent.
   9. Do NOT implement Survey Point persistence yet.
  10. Do NOT claim phone GNSS equals RTK/GNSS survey equipment.

   QA BASELINE
   ----------------------------------------------------------
   ✓ IndexedDB v4
   ✓ Project lifecycle
   ✓ Startup Home
   ✓ Resume Project
   ✓ Saved Project
   ✓ ArcGIS Default
   ✓ Smart GNSS watchPosition
   ✓ Multi-sample acquisition
   ✓ Accuracy + stability QA
   ✓ No synthetic GIS data
   ✓ Current index.html IDs
   ✓ Current DB v4 API

   IMPORTANT
   ----------------------------------------------------------
   This revision is the Smart GNSS acquisition release.

   It intentionally does NOT:
   - create survey points
   - save GPS points
   - claim centimeter accuracy from smartphone GNSS
   - perform VN-2000 conversion
   - create demo GIS objects
   - create D001
   - implement VN-2000 conversion
   - implement GIS export
   - implement camera survey

   Those belong to subsequent QA gates.
========================================================== */


/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentProject = null;

let dbReady = false;

let databaseApi = null;

const $ = (id) => {
    return document.getElementById(id);
};


/* ==========================================================
   PROJECT STATUS
========================================================== */

const TGS_APP_PROJECT_STATUS = {

    DRAFT: "DRAFT",

    IN_PROGRESS: "IN_PROGRESS",

    COMPLETED: "COMPLETED",

    SAVED: "SAVED"

};


/* ==========================================================
   STARTUP STATE
========================================================== */

let startupState = {

    draftProject: null,

    savedProjects: []

};


/* ==========================================================
   GPS STATE
========================================================== */

const GPSState = {

    available: false,

    acquiring: false,

    latitude: null,

    longitude: null,

    accuracy: null,

    altitude: null,

    timestamp: null,

    error: null

};


/* ==========================================================
   SMART GNSS STATE

   This state is deliberately session-only.
   No sample is persisted to IndexedDB in REV14.
========================================================== */

const SmartGNSSState = {

    active: false,

    samples: [],

    targetSamples: 20,

    minimumSamples: 10,

    maxSamples: 30,

    minSampleIntervalMs: 700,

    lastAcceptedTimestamp: 0,

    watchId: null,

    startedAt: null,

    finishedAt: null,

    medianAccuracy: null,

    stabilityMeters: null,

    representative: null,

    quality: "IDLE",

    qualityLabel: "Chưa đo",

    ready: false,

    error: null

};


/* ==========================================================
   GIS LAYER STATE

   IMPORTANT:
   These are UI visibility states only.

   They do NOT create synthetic GIS objects.
========================================================== */

const GISLayerState = {

    surveyPoint: true,

    surveyRoute: true,

    pipe: false,

    valve: false,

    tee: false,

    elbow: false,

    waterStation: false,

    customerMeter: false

};


/* ==========================================================
   DATABASE API RESOLUTION

   DB v4 exposes:
   - DB
   - window.TGS_DB

   We intentionally do not invent any new DB API.
========================================================== */

function resolveDatabaseApi() {

    try {

        if (
            typeof DB !== "undefined" &&
            DB
        ) {

            return DB;

        }

    } catch (error) {

        /* Ignore and continue. */

    }


    if (
        window.TGS_DB
    ) {

        return window.TGS_DB;

    }


    if (
        window.TGS &&
        window.TGS.DB
    ) {

        return window.TGS.DB;

    }


    return null;

}


/* ==========================================================
   DATABASE GUARD
========================================================== */

function requireDatabase() {

    databaseApi =
        databaseApi ||
        resolveDatabaseApi();


    if (!databaseApi) {

        throw new Error(
            "TGS Database API không khả dụng."
        );

    }


    return databaseApi;

}


/* ==========================================================
   SCREEN MANAGER
========================================================== */

const screens = [

    "screenSplash",

    "screenProjectHome",

    "screenProject",

    "screenSurveyHome",

    "screenPoint",

    "screenLinear",

    "screenProjectComplete"

];


function show(screenId) {

    screens.forEach(
        id => {

            const screen = $(id);

            if (screen) {

                screen.classList.remove(
                    "active"
                );

            }

        }
    );


    const target =
        $(screenId);


    if (!target) {

        console.warn(
            "TGS Screen not found:",
            screenId
        );

        return;

    }


    target.classList.add(
        "active"
    );


    if (
        screenId ===
        "screenLinear"
    ) {

        setTimeout(
            () => {

                MapEngine.initialize();

                MapLayerControl.initialize();

                SmartGNSSUI.ensure();

                SmartGNSSUI.update();

                updateLinearUI();

            },
            150
        );

    }

}


/* ==========================================================
   PROJECT CLASSIFICATION
========================================================== */

function isDraftProject(project) {

    if (!project) {

        return false;

    }


    if (
        project.status ===
        TGS_APP_PROJECT_STATUS.DRAFT
    ) {

        return true;

    }


    if (
        project.status ===
        TGS_APP_PROJECT_STATUS.IN_PROGRESS
    ) {

        return true;

    }


    if (
        project.status ===
        "draft"
    ) {

        return true;

    }


    if (
        project.status ===
        "in_progress"
    ) {

        return true;

    }


    if (
        project.status ===
        TGS_APP_PROJECT_STATUS.COMPLETED &&
        project.isSaved !== true
    ) {

        return true;

    }


    if (
        project.completed === false &&
        project.isSaved !== true
    ) {

        return true;

    }


    if (
        project.isSaved === false
    ) {

        return true;

    }


    return false;

}


function isSavedProject(project) {

    if (!project) {

        return false;

    }


    if (
        project.status ===
        TGS_APP_PROJECT_STATUS.SAVED
    ) {

        return true;

    }


    if (
        project.status ===
        "saved"
    ) {

        return true;

    }


    if (
        project.isSaved === true
    ) {

        return true;

    }


    return false;

}


/* ==========================================================
   PROJECT STATE LOADER

   DB v4 API:
   - getAllProjects()
========================================================== */

async function loadProjectState() {

    if (!dbReady) {

        return;

    }


    try {

        const database =
            requireDatabase();


        let projects =
            await database.getAllProjects();


        if (
            !Array.isArray(projects)
        ) {

            projects = [];

        }


        projects =
            projects.filter(
                project =>
                    project &&
                    project.projectId
            );


        projects.sort(
            (a, b) => {

                const aDate =
                    new Date(
                        a.updatedAt ||
                        a.savedAt ||
                        a.createdAt ||
                        0
                    );

                const bDate =
                    new Date(
                        b.updatedAt ||
                        b.savedAt ||
                        b.createdAt ||
                        0
                    );

                return bDate - aDate;

            }
        );


        startupState.draftProject =
            projects.find(
                project =>
                    isDraftProject(
                        project
                    )
            ) || null;


        startupState.savedProjects =
            projects.filter(
                project =>
                    isSavedProject(
                        project
                    )
            );


        /*
         * Compatibility rule:
         *
         * Older project records created before
         * lifecycle fields existed are considered
         * saved/readable records rather than being
         * silently discarded.
         */

        if (
            startupState.savedProjects.length === 0
        ) {

            startupState.savedProjects =
                projects.filter(
                    project => {

                        const hasLifecycleFields =

                            Object.prototype
                                .hasOwnProperty
                                .call(
                                    project,
                                    "status"
                                ) ||

                            Object.prototype
                                .hasOwnProperty
                                .call(
                                    project,
                                    "isSaved"
                                ) ||

                            Object.prototype
                                .hasOwnProperty
                                .call(
                                    project,
                                    "completed"
                                );


                        return (
                            !hasLifecycleFields &&
                            project !==
                            startupState.draftProject
                        );

                    }
                );

        }


        renderProjectHome();

    } catch (error) {

        console.error(
            "TGS Project State Error:",
            error
        );

    }

}


/* ==========================================================
   PROJECT HOME RENDER
========================================================== */

function renderProjectHome() {

    const notice =
        $("projectDraftNotice");


    const resumeButton =
        $("btnContinueDraft");


    const savedList =
        $("savedProjectList");


    if (notice) {

        notice.hidden =
            !startupState.draftProject;

    }


    if (resumeButton) {

        resumeButton.style.display =
            startupState.draftProject
                ? ""
                : "none";

    }


    if (savedList) {

        savedList.hidden = true;

    }


    renderSavedProjectItems();

}


/* ==========================================================
   SAVED PROJECT LIST
========================================================== */

function renderSavedProjectItems() {

    const container =
        $("savedProjectItems");


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (
        startupState.savedProjects.length ===
        0
    ) {

        container.innerHTML = `

            <div class="empty-project">

                Chưa có công trình đã lưu.

            </div>

        `;

        return;

    }


    startupState.savedProjects.forEach(
        project => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "saved-card";


            const name =
                escapeHtml(
                    project.projectName ||
                    "Công trình"
                );


            const code =
                escapeHtml(
                    project.projectCode ||
                    ""
                );


            const location =
                escapeHtml(
                    project.location ||
                    ""
                );


            const projectId =
                escapeHtml(
                    project.projectId ||
                    ""
                );


            card.innerHTML = `

                <h4>
                    ${name}
                </h4>

                <p>
                    Mã: ${code}
                </p>

                <p>
                    ${location}
                </p>

                <button
                    class="primary-btn open-project"
                    type="button"
                    data-project-id="${projectId}"
                >
                    Mở công trình
                </button>

            `;


            container.appendChild(
                card
            );

        }
    );


    container
        .querySelectorAll(
            ".open-project"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const projectId =
                            button.dataset.projectId;

                        openSavedProject(
                            projectId
                        );

                    }
                );

            }
        );

}


/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* ==========================================================
   OPEN SAVED PROJECT PANEL
========================================================== */

function openSavedProjects() {

    renderSavedProjectItems();


    const panel =
        $("savedProjectList");


    if (panel) {

        panel.hidden = false;

    }

}


/* ==========================================================
   CLOSE SAVED PROJECT PANEL
========================================================== */

function closeSavedProjects() {

    const panel =
        $("savedProjectList");


    if (panel) {

        panel.hidden = true;

    }

}


/* ==========================================================
   RESUME DRAFT PROJECT
========================================================== */

function resumeProject() {

    if (
        !startupState.draftProject
    ) {

        return;

    }


    currentProject =
        startupState.draftProject;


    updateProjectUI();


    resetGPSState();


    show(
        "screenSurveyHome"
    );

}


/* ==========================================================
   OPEN SAVED PROJECT
========================================================== */

async function openSavedProject(
    projectId
) {

    if (!dbReady) {

        alert(
            "Offline Database chưa sẵn sàng."
        );

        return;

    }


    try {

        const database =
            requireDatabase();


        let project = null;


        if (
            typeof database.getProject ===
            "function"
        ) {

            project =
                await database.getProject(
                    projectId
                );

        } else if (
            typeof database.getProjectById ===
            "function"
        ) {

            /*
             * Compatibility fallback only.
             * DB v4 should use getProject().
             */

            project =
                await database.getProjectById(
                    projectId
                );

        }


        if (!project) {

            alert(
                "Không tìm thấy công trình."
            );

            await loadProjectState();

            return;

        }


        currentProject =
            project;


        closeSavedProjects();


        updateProjectUI();


        resetGPSState();


        show(
            "screenSurveyHome"
        );

    } catch (error) {

        console.error(
            "TGS Open Project Error:",
            error
        );


        alert(
            "Không thể mở công trình."
        );

    }

}


/* ==========================================================
   PROJECT UI
========================================================== */

function updateProjectUI() {

    if (!currentProject) {

        return;

    }


    const projectTitle =
        $("projectTitle");


    if (projectTitle) {

        projectTitle.textContent =
            currentProject.projectName ||
            "Chưa có công trình";

    }


    const linearProject =
        $("linearProject");


    if (linearProject) {

        linearProject.textContent =
            currentProject.projectName ||
            "Công trình";

    }


    const completeTitle =
        $("completeProjectTitle");


    if (completeTitle) {

        completeTitle.textContent =
            currentProject.projectName ||
            "Công trình";

    }


    const completeName =
        $("completeProjectName");


    if (completeName) {

        completeName.textContent =
            currentProject.projectName ||
            "Chưa có công trình";

    }


    const completeCode =
        $("completeProjectCode");


    if (completeCode) {

        completeCode.textContent =
            currentProject.projectCode ||
            "";

    }

}


/* ==========================================================
   PROJECT FORM RESET
========================================================== */

function resetProjectForm() {

    [

        "projectName",

        "projectCode",

        "projectLocation",

        "organization"

    ].forEach(
        id => {

            const input =
                $(id);


            if (input) {

                input.value = "";

            }

        }
    );

}


/* ==========================================================
   CREATE PROJECT
========================================================== */

async function createProject() {

    if (!dbReady) {

        alert(
            "Offline Database chưa sẵn sàng."
        );

        return;

    }


    const nameInput =
        $("projectName");


    const codeInput =
        $("projectCode");


    const locationInput =
        $("projectLocation");


    const organizationInput =
        $("organization");


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const code =
        codeInput
            ? codeInput.value.trim()
            : "";


    const location =
        locationInput
            ? locationInput.value.trim()
            : "";


    const organization =
        organizationInput
            ? organizationInput.value.trim()
            : "";


    if (
        name === "" ||
        code === ""
    ) {

        alert(
            "Vui lòng nhập Tên và Mã công trình."
        );

        return;

    }


    try {

        const database =
            requireDatabase();


        /*
         * DB v4 createProject() accepts the
         * core project fields.
         */

        const createdProject =
            await database.createProject({

                projectName:
                    name,

                projectCode:
                    code,

                location:
                    location,

                organization:
                    organization

            });


        /*
         * Normalize lifecycle state after creation.
         *
         * This is intentionally a second write because
         * the DB project creator owns the canonical
         * identity fields.
         */

        currentProject = {

            ...createdProject,

            status:
                TGS_APP_PROJECT_STATUS.DRAFT,

            completed:
                false,

            isSaved:
                false,

            updatedAt:
                new Date().toISOString()

        };


        await database.updateProject(
            currentProject
        );


        await loadProjectState();


        updateProjectUI();


        resetGPSState();


        show(
            "screenSurveyHome"
        );

    } catch (error) {

        console.error(
            "TGS Create Project Error:",
            error
        );


        alert(
            "Không thể tạo công trình."
        );

    }

}


/* ==========================================================
   COMPLETE PROJECT
========================================================== */

async function completeProject() {

    if (!currentProject) {

        return;

    }


    const confirmed =
        window.confirm(
            "Bạn có chắc chắn muốn hoàn thành khảo sát công trình này?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const database =
            requireDatabase();


        currentProject = {

            ...currentProject,

            status:
                TGS_APP_PROJECT_STATUS.COMPLETED,

            completed:
                true,

            isSaved:
                false,

            completedAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        };


        await database.updateProject(
            currentProject
        );


        await loadProjectState();


        updateProjectUI();


        show(
            "screenProjectComplete"
        );

    } catch (error) {

        console.error(
            "TGS Complete Project Error:",
            error
        );


        alert(
            "Không thể hoàn thành công trình."
        );

    }

}


/* ==========================================================
   SAVE PROJECT
========================================================== */

async function saveProject() {

    if (!currentProject) {

        return;

    }


    const confirmed =
        window.confirm(
            "Lưu công trình này vào danh sách công trình đã lưu?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const database =
            requireDatabase();


        currentProject = {

            ...currentProject,

            status:
                TGS_APP_PROJECT_STATUS.SAVED,

            completed:
                true,

            isSaved:
                true,

            savedAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        };


        await database.updateProject(
            currentProject
        );


        await loadProjectState();


        updateProjectUI();


        alert(
            "Đã lưu công trình thành công."
        );


        show(
            "screenProjectHome"
        );

    } catch (error) {

        console.error(
            "TGS Save Project Error:",
            error
        );


        alert(
            "Không thể lưu công trình."
        );

    }

}


/* ==========================================================
   RETURN TO SURVEY
========================================================== */

function backToSurveyFromCompletion() {

    if (!currentProject) {

        return;

    }


    show(
        "screenSurveyHome"
    );

}


/* ==========================================================
   MAP ENGINE
========================================================== */

const MapEngine = {

    map: null,

    baseLayer: null,

    gpsMarker: null,

    gpsAccuracyCircle: null,

    activeProvider:
        "arcgis",

    defaultLocation: [

        10.762622,

        106.660172

    ],


    /* ------------------------------------------------------
       INITIALIZE MAP
    ------------------------------------------------------ */

    initialize() {

        const mapElement =
            $("map");


        if (!mapElement) {

            return;

        }


        if (this.map) {

            setTimeout(
                () => {

                    this.map.invalidateSize();

                },
                50
            );

            return;

        }


        this.map =
            L.map(
                "map",
                {
                    zoomControl:
                        false
                }
            ).setView(
                this.defaultLocation,
                18
            );


        /*
         * ArcGIS is the only active base map
         * in this baseline.
         */

        this.baseLayer =
            L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
                {

                    maxZoom:
                        22,

                    attribution:
                        "Tiles © Esri"

                }
            );


        this.baseLayer.addTo(
            this.map
        );


        /*
         * IMPORTANT:
         *
         * No default marker.
         * No D001.
         * No demo geometry.
         * No synthetic project data.
         */

        this.map.whenReady(
            () => {

                this.map.invalidateSize();

            }
        );

    },


    /* ------------------------------------------------------
       SWITCH BASE MAP
    ------------------------------------------------------ */

    switchBaseMap(
        provider
    ) {

        if (!this.map) {

            return;

        }


        /*
         * Google providers remain intentionally
         * disabled/prepared in current index.html.
         */

        if (
            provider !==
            "arcgis"
        ) {

            console.log(
                "TGS GIS: provider prepared but not activated:",
                provider
            );

            return;

        }


        if (
            this.baseLayer &&
            !this.map.hasLayer(
                this.baseLayer
            )
        ) {

            this.baseLayer.addTo(
                this.map
            );

        }


        this.activeProvider =
            "arcgis";

    },


    /* ------------------------------------------------------
       ZOOM IN
    ------------------------------------------------------ */

    zoomIn() {

        if (this.map) {

            this.map.zoomIn();

        }

    },


    /* ------------------------------------------------------
       ZOOM OUT
    ------------------------------------------------------ */

    zoomOut() {

        if (this.map) {

            this.map.zoomOut();

        }

    },


    /* ------------------------------------------------------
       LOCATE
    ------------------------------------------------------ */

    locate() {

        GPSManager.acquire();

    },


    /* ------------------------------------------------------
       SHOW GPS POSITION
    ------------------------------------------------------ */

    showGPSPosition(
        latitude,
        longitude,
        accuracy
    ) {

        if (!this.map) {

            return;

        }


        const position = [

            latitude,

            longitude

        ];


        this.map.flyTo(
            position,
            19,
            {
                duration:
                    1
            }
        );


        /*
         * Current GPS marker only.
         *
         * This is NOT persisted survey data.
         */

        if (
            !this.gpsMarker
        ) {

            this.gpsMarker =
                L.circleMarker(
                    position,
                    {

                        radius:
                            8,

                        weight:
                            3,

                        fillOpacity:
                            0.8

                    }
                ).addTo(
                    this.map
                );

        } else {

            this.gpsMarker.setLatLng(
                position
            );

        }


        if (
            Number.isFinite(
                accuracy
            )
        ) {

            if (
                !this.gpsAccuracyCircle
            ) {

                this.gpsAccuracyCircle =
                    L.circle(
                        position,
                        {

                            radius:
                                accuracy,

                            weight:
                                1,

                            fillOpacity:
                                0.08

                        }
                    ).addTo(
                        this.map
                    );

            } else {

                this.gpsAccuracyCircle
                    .setLatLng(
                        position
                    );

                this.gpsAccuracyCircle
                    .setRadius(
                        accuracy
                    );

            }

        }

    },


    /* ------------------------------------------------------
       RESET GPS VISUALS
    ------------------------------------------------------ */

    resetGPSVisuals() {

        if (
            this.map &&
            this.gpsMarker
        ) {

            this.map.removeLayer(
                this.gpsMarker
            );

        }


        if (
            this.map &&
            this.gpsAccuracyCircle
        ) {

            this.map.removeLayer(
                this.gpsAccuracyCircle
            );

        }


        this.gpsMarker = null;

        this.gpsAccuracyCircle = null;

    }

};


/* ==========================================================
   GPS MANAGER
========================================================== */

const GPSManager = {

    /* ------------------------------------------------------
       SUPPORT CHECK
    ------------------------------------------------------ */

    isSupported() {

        return (
            "geolocation" in
            navigator
        );

    },


    /* ------------------------------------------------------
       ERROR MESSAGE
    ------------------------------------------------------ */

    getErrorMessage(error) {

        if (!error) {

            return "Không xác định.";

        }


        switch (error.code) {

            case 1:

                return "Người dùng từ chối quyền GPS.";

            case 2:

                return "Thiết bị không xác định được vị trí.";

            case 3:

                return "GPS hết thời gian chờ.";

            default:

                return error.message || "Không xác định.";

        }

    },


    /* ------------------------------------------------------
       UPDATE HUD
    ------------------------------------------------------ */

    updateHUD() {

        const gpsText =
            $("gpsText");


        const gpsAccuracy =
            $("gpsAccuracy");


        if (!gpsText) {

            return;

        }


        if (
            SmartGNSSState.active
        ) {

            gpsText.textContent =
                "GPS: Đang đo " +
                SmartGNSSState.samples.length +
                "/" +
                SmartGNSSState.targetSamples;

            if (gpsAccuracy) {

                gpsAccuracy.textContent =
                    SmartGNSSState.medianAccuracy !== null
                        ? "± " +
                          Math.round(
                              SmartGNSSState.medianAccuracy
                          ) +
                          " m"
                        : "± --";

            }

            return;

        }


        if (
            GPSState.error
        ) {

            gpsText.textContent =
                "GPS: " +
                GPSState.error;

            if (gpsAccuracy) {

                gpsAccuracy.textContent =
                    "± --";

            }

            return;

        }


        if (
            SmartGNSSState.ready &&
            SmartGNSSState.representative
        ) {

            gpsText.textContent =
                "GPS: " +
                SmartGNSSState.qualityLabel;


            if (gpsAccuracy) {

                gpsAccuracy.textContent =
                    "± " +
                    Math.round(
                        SmartGNSSState.medianAccuracy
                    ) +
                    " m";

            }

            return;

        }


        if (
            GPSState.available
        ) {

            gpsText.textContent =
                "Lat " +
                GPSState.latitude.toFixed(6) +
                " · Lon " +
                GPSState.longitude.toFixed(6);


            if (gpsAccuracy) {

                gpsAccuracy.textContent =
                    "± " +
                    Math.round(
                        GPSState.accuracy
                    ) +
                    " m";

            }

            return;

        }


        gpsText.textContent =
            "GPS: Chưa kết nối";


        if (gpsAccuracy) {

            gpsAccuracy.textContent =
                "± --";

        }

    },


    /* ------------------------------------------------------
       SINGLE POSITION ACQUISITION

       Compatibility method retained for existing buttons.
       It does NOT persist a point.
    ------------------------------------------------------ */

    acquire() {

        if (
            !this.isSupported()
        ) {

            GPSState.error =
                "Thiết bị không hỗ trợ GPS.";

            GPSState.acquiring =
                false;

            GPSState.available =
                false;

            this.updateHUD();

            SmartGNSSUI.update();

            return;

        }


        if (
            SmartGNSSState.active
        ) {

            return;

        }


        GPSState.acquiring =
            true;

        GPSState.error =
            null;

        this.updateHUD();


        navigator.geolocation.getCurrentPosition(

            position => {

                this.handleSuccess(
                    position
                );

            },

            error => {

                this.handleError(
                    error
                );

            },

            {

                enableHighAccuracy:
                    true,

                timeout:
                    20000,

                maximumAge:
                    0

            }

        );

    },


    /* ------------------------------------------------------
       SMART GNSS START
    ------------------------------------------------------ */

    startSmartMeasurement() {

        if (
            !this.isSupported()
        ) {

            this.handleError({

                code: 0,

                message:
                    "Thiết bị không hỗ trợ GPS."

            });

            return;

        }


        if (
            SmartGNSSState.active
        ) {

            return;

        }


        this.stopSmartMeasurement(false);


        SmartGNSSState.active =
            true;

        SmartGNSSState.samples =
            [];

        SmartGNSSState.targetSamples =
            20;

        SmartGNSSState.minimumSamples =
            10;

        SmartGNSSState.maxSamples =
            30;

        SmartGNSSState.minSampleIntervalMs =
            700;

        SmartGNSSState.lastAcceptedTimestamp =
            0;

        SmartGNSSState.watchId =
            null;

        SmartGNSSState.startedAt =
            Date.now();

        SmartGNSSState.finishedAt =
            null;

        SmartGNSSState.medianAccuracy =
            null;

        SmartGNSSState.stabilityMeters =
            null;

        SmartGNSSState.representative =
            null;

        SmartGNSSState.quality =
            "ACQUIRING";

        SmartGNSSState.qualityLabel =
            "Đang thu GNSS";

        SmartGNSSState.ready =
            false;

        SmartGNSSState.error =
            null;


        GPSState.acquiring =
            true;

        GPSState.error =
            null;


        SmartGNSSUI.update();
        this.updateHUD();


        try {

            SmartGNSSState.watchId =
                navigator.geolocation.watchPosition(

                    position => {

                        this.handleSmartSample(
                            position
                        );

                    },

                    error => {

                        this.handleSmartError(
                            error
                        );

                    },

                    {

                        enableHighAccuracy:
                            true,

                        timeout:
                            20000,

                        maximumAge:
                            0

                    }

                );

        } catch (error) {

            SmartGNSSState.active =
                false;

            GPSState.acquiring =
                false;

            SmartGNSSState.error =
                error.message ||
                "Không thể khởi động GNSS.";

            SmartGNSSState.quality =
                "ERROR";

            SmartGNSSState.qualityLabel =
                "Lỗi GNSS";

            this.updateHUD();
            SmartGNSSUI.update();

        }

    },


    /* ------------------------------------------------------
       SMART GNSS SAMPLE HANDLER
    ------------------------------------------------------ */

    handleSmartSample(position) {

        if (
            !SmartGNSSState.active
        ) {

            return;

        }


        if (
            !position ||
            !position.coords
        ) {

            return;

        }


        const coords =
            position.coords;


        const latitude =
            Number(
                coords.latitude
            );


        const longitude =
            Number(
                coords.longitude
            );


        const accuracy =
            Number(
                coords.accuracy
            );


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(accuracy) ||
            accuracy <= 0
        ) {

            return;

        }


        const now =
            Date.now();


        if (
            SmartGNSSState.lastAcceptedTimestamp > 0 &&
            now -
                SmartGNSSState.lastAcceptedTimestamp <
                SmartGNSSState.minSampleIntervalMs
        ) {

            return;

        }


        SmartGNSSState.lastAcceptedTimestamp =
            now;


        const sample = {

            latitude,

            longitude,

            accuracy,

            altitude:
                Number.isFinite(
                    Number(
                        coords.altitude
                    )
                )
                    ? Number(
                          coords.altitude
                      )
                    : null,

            altitudeAccuracy:
                Number.isFinite(
                    Number(
                        coords.altitudeAccuracy
                    )
                )
                    ? Number(
                          coords.altitudeAccuracy
                      )
                    : null,

            heading:
                Number.isFinite(
                    Number(
                        coords.heading
                    )
                )
                    ? Number(
                          coords.heading
                      )
                    : null,

            speed:
                Number.isFinite(
                    Number(
                        coords.speed
                    )
                )
                    ? Number(
                          coords.speed
                      )
                    : null,

            timestamp:
                Number.isFinite(
                    Number(
                        position.timestamp
                    )
                )
                    ? Number(
                          position.timestamp
                      )
                    : Date.now()

        };


        SmartGNSSState.samples.push(
            sample
        );


        if (
            SmartGNSSState.samples.length >
            SmartGNSSState.maxSamples
        ) {

            SmartGNSSState.samples.shift();

        }


        GPSState.available =
            true;

        GPSState.acquiring =
            true;

        GPSState.latitude =
            latitude;

        GPSState.longitude =
            longitude;

        GPSState.accuracy =
            accuracy;

        GPSState.altitude =
            sample.altitude;

        GPSState.timestamp =
            sample.timestamp;

        GPSState.error =
            null;


        MapEngine.showGPSPosition(

            latitude,

            longitude,

            accuracy

        );


        this.evaluateSmartMeasurement();


        this.updateHUD();
        SmartGNSSUI.update();


        if (
            SmartGNSSState.samples.length >=
            SmartGNSSState.targetSamples
        ) {

            this.finishSmartMeasurement();

        }

    },


    /* ------------------------------------------------------
       SMART GNSS EVALUATION
    ------------------------------------------------------ */

    evaluateSmartMeasurement() {

        const samples =
            SmartGNSSState.samples;


        if (
            samples.length === 0
        ) {

            return;

        }


        const accuracies =
            samples
                .map(
                    sample =>
                        sample.accuracy
                )
                .filter(
                    value =>
                        Number.isFinite(value)
                );


        const medianAccuracy =
            this.median(
                accuracies
            );


        const representative =
            this.calculateRepresentative(
                samples
            );


        const stability =
            representative
                ? this.calculateStability(
                      samples,
                      representative
                  )
                : null;


        SmartGNSSState.medianAccuracy =
            medianAccuracy;

        SmartGNSSState.representative =
            representative;

        SmartGNSSState.stabilityMeters =
            stability;


        const classification =
            this.classifyQuality(
                medianAccuracy,
                stability,
                samples.length
            );


        SmartGNSSState.quality =
            classification.code;

        SmartGNSSState.qualityLabel =
            classification.label;

        SmartGNSSState.ready =
            classification.ready;


        if (
            representative
        ) {

            const vnCoord =
                $("vnCoord");


            if (vnCoord) {

                vnCoord.textContent =
                    "Chưa chuyển VN-2000";

            }

        }

    },


    /* ------------------------------------------------------
       QUALITY CLASSIFICATION

       These are TGS internal QA thresholds, not a national
       surveying standard and not a claim of absolute accuracy.
    ------------------------------------------------------ */

    classifyQuality(
        medianAccuracy,
        stability,
        sampleCount
    ) {

        if (
            !Number.isFinite(
                medianAccuracy
            ) ||
            !Number.isFinite(
                stability
            )
        ) {

            return {

                code:
                    "ACQUIRING",

                label:
                    "Đang thu GNSS",

                ready:
                    false

            };

        }


        if (
            sampleCount <
            SmartGNSSState.minimumSamples
        ) {

            return {

                code:
                    "ACQUIRING",

                label:
                    "Đang ổn định vị trí",

                ready:
                    false

            };

        }


        if (
            medianAccuracy <= 3 &&
            stability <= 3
        ) {

            return {

                code:
                    "SURVEY",

                label:
                    "Sẵn sàng khảo sát",

                ready:
                    true

            };

        }


        if (
            medianAccuracy <= 5 &&
            stability <= 5
        ) {

            return {

                code:
                    "GOOD",

                label:
                    "Tốt — có thể xem xét",

                ready:
                    true

            };

        }


        if (
            medianAccuracy <= 10 &&
            stability <= 10
        ) {

            return {

                code:
                    "REVIEW",

                label:
                    "Cần kiểm tra lại",

                ready:
                    false

            };

        }


        return {

            code:
                "POOR",

            label:
                "Sai số lớn — đo lại",

            ready:
                false

        };

    },


    /* ------------------------------------------------------
       MEDIAN
    ------------------------------------------------------ */

    median(values) {

        if (
            !Array.isArray(values) ||
            values.length === 0
        ) {

            return null;

        }


        const sorted =
            values
                .slice()
                .sort(
                    (a, b) => a - b
                );


        const middle =
            Math.floor(
                sorted.length / 2
            );


        if (
            sorted.length % 2 === 0
        ) {

            return (
                sorted[middle - 1] +
                sorted[middle]
            ) / 2;

        }


        return sorted[middle];

    },


    /* ------------------------------------------------------
       REPRESENTATIVE POSITION

       Weighted by reported accuracy, with a robust median
       fallback. The result is a field-quality representative
       coordinate, not a claim of improved sensor precision.
    ------------------------------------------------------ */

    calculateRepresentative(samples) {

        if (
            !Array.isArray(samples) ||
            samples.length === 0
        ) {

            return null;

        }


        const latitudes =
            samples.map(
                sample =>
                    sample.latitude
            );


        const longitudes =
            samples.map(
                sample =>
                    sample.longitude
            );


        const medianLat =
            this.median(
                latitudes
            );


        const medianLon =
            this.median(
                longitudes
            );


        if (
            !Number.isFinite(medianLat) ||
            !Number.isFinite(medianLon)
        ) {

            return null;

        }


        const weights =
            samples.map(
                sample => {

                    const accuracy =
                        Math.max(
                            1,
                            sample.accuracy
                        );

                    return 1 /
                        (accuracy * accuracy);

                }
            );


        let weightSum =
            0;

        let weightedLat =
            0;

        let weightedLon =
            0;


        samples.forEach(
            (sample, index) => {

                const weight =
                    weights[index];

                weightSum +=
                    weight;

                weightedLat +=
                    sample.latitude *
                    weight;

                weightedLon +=
                    sample.longitude *
                    weight;

            }
        );


        if (
            weightSum <= 0
        ) {

            return {

                latitude:
                    medianLat,

                longitude:
                    medianLon

            };

        }


        return {

            latitude:
                weightedLat /
                weightSum,

            longitude:
                weightedLon /
                weightSum

        };

    },


    /* ------------------------------------------------------
       DISTANCE
    ------------------------------------------------------ */

    distanceMeters(
        lat1,
        lon1,
        lat2,
        lon2
    ) {

        const earthRadius =
            6371000;


        const toRadians =
            degrees =>
                degrees *
                Math.PI /
                180;


        const dLat =
            toRadians(
                lat2 - lat1
            );

        const dLon =
            toRadians(
                lon2 - lon1
            );


        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(
                toRadians(lat1)
            ) *
            Math.cos(
                toRadians(lat2)
            ) *
            Math.sin(dLon / 2) ** 2;


        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );


        return earthRadius * c;

    },


    /* ------------------------------------------------------
       STABILITY

       Uses 95th percentile horizontal spread from the
       representative position. This describes repeatability
       of the current phone session; it does not replace a
       survey-grade uncertainty model.
    ------------------------------------------------------ */

    calculateStability(
        samples,
        representative
    ) {

        if (
            !Array.isArray(samples) ||
            samples.length === 0 ||
            !representative
        ) {

            return null;

        }


        const distances =
            samples
                .map(
                    sample =>
                        this.distanceMeters(
                            representative.latitude,
                            representative.longitude,
                            sample.latitude,
                            sample.longitude
                        )
                )
                .filter(
                    value =>
                        Number.isFinite(value)
                )
                .sort(
                    (a, b) => a - b
                );


        if (
            distances.length === 0
        ) {

            return null;

        }


        const index =
            Math.min(
                distances.length - 1,
                Math.max(
                    0,
                    Math.ceil(
                        distances.length *
                        0.95
                    ) - 1
                )
            );


        return distances[index];

    },


    /* ------------------------------------------------------
       FINISH SMART MEASUREMENT
    ------------------------------------------------------ */

    finishSmartMeasurement() {

        if (
            !SmartGNSSState.active
        ) {

            return;

        }


        this.stopSmartMeasurement(
            true
        );


        this.evaluateSmartMeasurement();


        if (
            SmartGNSSState.representative
        ) {

            GPSState.latitude =
                SmartGNSSState.representative.latitude;

            GPSState.longitude =
                SmartGNSSState.representative.longitude;

            GPSState.accuracy =
                SmartGNSSState.medianAccuracy;


            MapEngine.showGPSPosition(

                GPSState.latitude,

                GPSState.longitude,

                GPSState.accuracy

            );

        }


        this.updateHUD();
        SmartGNSSUI.update();

    },


    /* ------------------------------------------------------
       STOP SMART MEASUREMENT
    ------------------------------------------------------ */

    stopSmartMeasurement(
        finished
    ) {

        const wasActive =
            SmartGNSSState.active;


        if (
            SmartGNSSState.watchId !== null
        ) {

            try {

                navigator.geolocation.clearWatch(
                    SmartGNSSState.watchId
                );

            } catch (error) {

                console.warn(
                    "TGS GNSS clearWatch error:",
                    error
                );

            }

        }


        SmartGNSSState.watchId =
            null;

        SmartGNSSState.active =
            false;

        SmartGNSSState.finishedAt =
            Date.now();

        GPSState.acquiring =
            false;


        if (
            finished &&
            wasActive
        ) {

            SmartGNSSState.qualityLabel =
                SmartGNSSState.ready
                    ? SmartGNSSState.qualityLabel
                    : "Đo xong — chưa đạt QA";

        }


        this.updateHUD();
        SmartGNSSUI.update();

    },


    /* ------------------------------------------------------
       SMART GNSS ERROR
    ------------------------------------------------------ */

    handleSmartError(error) {

        SmartGNSSState.error =
            this.getErrorMessage(
                error
            );


        if (
            SmartGNSSState.samples.length === 0
        ) {

            SmartGNSSState.quality =
                "ERROR";

            SmartGNSSState.qualityLabel =
                "Không lấy được GPS";

        }


        GPSState.error =
            SmartGNSSState.error;


        if (
            SmartGNSSState.active
        ) {

            this.stopSmartMeasurement(
                false
            );

        }


        this.updateHUD();
        SmartGNSSUI.update();


        console.warn(
            "TGS Smart GNSS Error:",
            error
        );

    },


    /* ------------------------------------------------------
       SINGLE FIX SUCCESS
    ------------------------------------------------------ */

    handleSuccess(
        position
    ) {

        const coords =
            position.coords;


        GPSState.available =
            true;

        GPSState.acquiring =
            false;

        GPSState.latitude =
            coords.latitude;

        GPSState.longitude =
            coords.longitude;

        GPSState.accuracy =
            coords.accuracy;

        GPSState.altitude =
            coords.altitude;

        GPSState.timestamp =
            position.timestamp;

        GPSState.error =
            null;


        this.updateHUD();


        MapEngine.showGPSPosition(

            GPSState.latitude,

            GPSState.longitude,

            GPSState.accuracy

        );


        const vnCoord =
            $("vnCoord");


        if (vnCoord) {

            vnCoord.textContent =
                "Chưa chuyển VN-2000";

        }


        SmartGNSSUI.update();

    },


    /* ------------------------------------------------------
       SINGLE FIX ERROR
    ------------------------------------------------------ */

    handleError(
        error
    ) {

        GPSState.available =
            false;

        GPSState.acquiring =
            false;

        GPSState.error =
            this.getErrorMessage(
                error
            );


        this.updateHUD();
        SmartGNSSUI.update();


        console.warn(
            "TGS GPS Error:",
            error
        );

    },


    /* ------------------------------------------------------
       RESET
    ------------------------------------------------------ */

    reset() {

        this.stopSmartMeasurement(
            false
        );


        GPSState.available =
            false;

        GPSState.acquiring =
            false;

        GPSState.latitude =
            null;

        GPSState.longitude =
            null;

        GPSState.accuracy =
            null;

        GPSState.altitude =
            null;

        GPSState.timestamp =
            null;

        GPSState.error =
            null;


        SmartGNSSState.samples =
            [];

        SmartGNSSState.medianAccuracy =
            null;

        SmartGNSSState.stabilityMeters =
            null;

        SmartGNSSState.representative =
            null;

        SmartGNSSState.quality =
            "IDLE";

        SmartGNSSState.qualityLabel =
            "Chưa đo";

        SmartGNSSState.ready =
            false;

        SmartGNSSState.error =
            null;

        SmartGNSSState.startedAt =
            null;

        SmartGNSSState.finishedAt =
            null;


        MapEngine.resetGPSVisuals();


        this.updateHUD();
        SmartGNSSUI.update();


        const vnCoord =
            $("vnCoord");


        if (vnCoord) {

            vnCoord.textContent =
                "X / Y";

        }


        const pointCode =
            $("pointCode");


        if (pointCode) {

            pointCode.textContent =
                "Chưa có";

        }

    },


    resetState() {

        this.reset();

    }

};


/* ==========================================================
   SMART GNSS UI

   REV14 adds a compact field QA panel dynamically so that
   index.html does not need a breaking structural change.
========================================================== */

const SmartGNSSUI = {

    panelId:
        "tgsSmartGNSSPanel",


    styleId:
        "tgsSmartGNSSStyle",


    ensure() {

        if ($(
            this.panelId
        )) {

            return $(
                this.panelId
            );

        }


        const screen =
            $("screenLinear");


        if (!screen) {

            return null;

        }


        if (!$(
            this.styleId
        )) {

            const style =
                document.createElement(
                    "style"
                );

            style.id =
                this.styleId;

            style.textContent = `
                #tgsSmartGNSSPanel {
                    margin: 12px 0;
                    padding: 12px;
                    border: 1px solid rgba(21,101,192,.16);
                    border-radius: 14px;
                    background: rgba(255,255,255,.96);
                    box-shadow: 0 4px 18px rgba(0,0,0,.06);
                    font-family: inherit;
                }
                #tgsSmartGNSSPanel .tgs-gnss-title {
                    font-weight: 700;
                    margin-bottom: 8px;
                }
                #tgsSmartGNSSPanel .tgs-gnss-grid {
                    display: grid;
                    grid-template-columns: repeat(2,minmax(0,1fr));
                    gap: 8px;
                }
                #tgsSmartGNSSPanel .tgs-gnss-item {
                    padding: 8px;
                    border-radius: 10px;
                    background: rgba(0,0,0,.035);
                }
                #tgsSmartGNSSPanel .tgs-gnss-label {
                    display: block;
                    font-size: 11px;
                    opacity: .68;
                    margin-bottom: 3px;
                }
                #tgsSmartGNSSPanel .tgs-gnss-value {
                    display: block;
                    font-size: 14px;
                    font-weight: 650;
                }
                #tgsSmartGNSSPanel .tgs-gnss-status {
                    margin-top: 9px;
                    font-weight: 700;
                }
                #tgsSmartGNSSPanel .tgs-gnss-note {
                    margin-top: 7px;
                    font-size: 11px;
                    line-height: 1.4;
                    opacity: .72;
                }
                #tgsSmartGNSSPanel .tgs-gnss-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                }
                #tgsSmartGNSSPanel button {
                    flex: 1;
                    min-height: 42px;
                }
                @media (max-width: 520px) {
                    #tgsSmartGNSSPanel .tgs-gnss-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
            `;

            document.head.appendChild(
                style
            );

        }


        const panel =
            document.createElement(
                "section"
            );

        panel.id =
            this.panelId;

        panel.innerHTML = `
            <div class="tgs-gnss-title">
                TGS Smart GNSS
            </div>

            <div class="tgs-gnss-grid">

                <div class="tgs-gnss-item">
                    <span class="tgs-gnss-label">Mẫu</span>
                    <span class="tgs-gnss-value" data-gnss="samples">0 / 20</span>
                </div>

                <div class="tgs-gnss-item">
                    <span class="tgs-gnss-label">Accuracy trung vị</span>
                    <span class="tgs-gnss-value" data-gnss="accuracy">--</span>
                </div>

                <div class="tgs-gnss-item">
                    <span class="tgs-gnss-label">Độ ổn định</span>
                    <span class="tgs-gnss-value" data-gnss="stability">--</span>
                </div>

                <div class="tgs-gnss-item">
                    <span class="tgs-gnss-label">Nguồn</span>
                    <span class="tgs-gnss-value">Smartphone GNSS</span>
                </div>

            </div>

            <div
                class="tgs-gnss-status"
                data-gnss="status"
            >
                Chưa đo
            </div>

            <div
                class="tgs-gnss-note"
            >
                REV14 chỉ đánh giá chất lượng và độ ổn định của GNSS hiện tại.
                Chưa lưu điểm và không tuyên bố độ chính xác tuyệt đối.
            </div>

            <div class="tgs-gnss-actions">

                <button
                    id="btnSmartGNSSStart"
                    type="button"
                    class="primary-btn"
                >
                    Bắt đầu đo GPS
                </button>

                <button
                    id="btnSmartGNSSStop"
                    type="button"
                    class="secondary-btn"
                >
                    Dừng đo
                </button>

            </div>
        `;


        const map =
            $("map");


        if (
            map &&
            map.parentElement
        ) {

            map.parentElement.insertBefore(
                panel,
                map
            );

        } else {

            screen.appendChild(
                panel
            );

        }


        const startButton =
            $("btnSmartGNSSStart");

        if (startButton) {

            startButton.addEventListener(
                "click",
                () => {

                    if (
                        SmartGNSSState.active
                    ) {

                        return;

                    }

                    GPSManager.startSmartMeasurement();

                }
            );

        }


        const stopButton =
            $("btnSmartGNSSStop");

        if (stopButton) {

            stopButton.addEventListener(
                "click",
                () => {

                    GPSManager.stopSmartMeasurement(
                        false
                    );

                    GPSManager.evaluateSmartMeasurement();

                    GPSManager.updateHUD();

                    this.update();

                }
            );

        }


        return panel;

    },


    update() {

        const panel =
            this.ensure();


        if (!panel) {

            return;

        }


        const sampleElement =
            panel.querySelector(
                '[data-gnss="samples"]'
            );


        const accuracyElement =
            panel.querySelector(
                '[data-gnss="accuracy"]'
            );


        const stabilityElement =
            panel.querySelector(
                '[data-gnss="stability"]'
            );


        const statusElement =
            panel.querySelector(
                '[data-gnss="status"]'
            );


        if (sampleElement) {

            sampleElement.textContent =
                SmartGNSSState.samples.length +
                " / " +
                SmartGNSSState.targetSamples;

        }


        if (accuracyElement) {

            accuracyElement.textContent =
                Number.isFinite(
                    SmartGNSSState.medianAccuracy
                )
                    ? "± " +
                      SmartGNSSState.medianAccuracy.toFixed(1) +
                      " m"
                    : "--";

        }


        if (stabilityElement) {

            stabilityElement.textContent =
                Number.isFinite(
                    SmartGNSSState.stabilityMeters
                )
                    ? "≤ " +
                      SmartGNSSState.stabilityMeters.toFixed(1) +
                      " m"
                    : "--";

        }


        if (statusElement) {

            statusElement.textContent =
                SmartGNSSState.qualityLabel;

        }


        const startButton =
            $("btnSmartGNSSStart");

        const stopButton =
            $("btnSmartGNSSStop");


        if (startButton) {

            startButton.disabled =
                SmartGNSSState.active;

            startButton.textContent =
                SmartGNSSState.active
                    ? "Đang đo GPS…"
                    : "Bắt đầu đo GPS";

        }


        if (stopButton) {

            stopButton.disabled =
                !SmartGNSSState.active;

        }

    }

};


/* ==========================================================
   GPS COMPATIBILITY ALIAS
========================================================== */

const GPS = {

    readCurrentLocation() {

        GPSManager.acquire();

    },

    startSmartMeasurement() {

        GPSManager.startSmartMeasurement();

    },

    stopSmartMeasurement() {

        GPSManager.stopSmartMeasurement(false);

        GPSManager.evaluateSmartMeasurement();

        SmartGNSSUI.update();

    },

    reset() {

        GPSManager.reset();

    }

};


/* ==========================================================
   RESET GPS STATE
========================================================== */

function resetGPSState() {

    GPSManager.reset();

}


/* ==========================================================
   MAP LAYER CONTROL
========================================================== */

const MapLayerControl = {

    initialized:
        false,


    /* ------------------------------------------------------
       BASE MAP CONTROLS
    ------------------------------------------------------ */

    bindBaseMapControls() {

        const controls =
            document.querySelectorAll(
                'input[name="baseMap"]'
            );


        controls.forEach(
            control => {

                if (
                    control.dataset.tgsBound ===
                    "true"
                ) {

                    return;

                }


                control.dataset.tgsBound =
                    "true";


                control.addEventListener(
                    "change",
                    () => {

                        if (
                            !control.checked
                        ) {

                            return;

                        }


                        if (
                            control.value ===
                            "arcgis"
                        ) {

                            MapEngine
                                .switchBaseMap(
                                    "arcgis"
                                );

                            return;

                        }


                        console.log(
                            "TGS GIS: provider prepared but not activated.",
                            control.value
                        );

                    }
                );

            }
        );

    },


    /* ------------------------------------------------------
       GIS LAYER CONTROLS
    ------------------------------------------------------ */

    bindGISLayerControls() {

        const controls =
            document.querySelectorAll(
                "input[type='checkbox'][data-layer]"
            );


        controls.forEach(
            control => {

                if (
                    control.dataset.tgsBound ===
                    "true"
                ) {

                    return;

                }


                control.dataset.tgsBound =
                    "true";


                const container =
                    control.closest(
                        "[data-layer]"
                    );


                if (!container) {

                    return;

                }


                const layerId =
                    container.dataset.layer;


                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            GISLayerState,
                            layerId
                        )
                ) {

                    GISLayerState[
                        layerId
                    ] =
                        control.checked;

                }


                control.addEventListener(
                    "change",
                    () => {

                        if (
                            Object.prototype
                                .hasOwnProperty
                                .call(
                                    GISLayerState,
                                    layerId
                                )
                        ) {

                            GISLayerState[
                                layerId
                            ] =
                                control.checked;

                        }


                        /*
                         * No synthetic geometry is
                         * created here.
                         *
                         * Actual GIS data will be
                         * loaded from IndexedDB when
                         * Survey Point / Route
                         * persistence is implemented.
                         */

                        console.log(
                            "TGS GIS Layer visibility:",
                            layerId,
                            control.checked
                        );

                    }
                );

            }
        );

    },


    /* ------------------------------------------------------
       SYNC UI
    ------------------------------------------------------ */

    syncUI() {

        Object.keys(
            GISLayerState
        ).forEach(
            layerId => {

                const control =
                    document.querySelector(
                        `input[type="checkbox"][data-layer="${({surveyPoint:"point",surveyRoute:"route",pipe:"pipe",valve:"valve",tee:"tee",elbow:"elbow",waterStation:"station",customerMeter:"meter"})[layerId] || layerId}"]`
                    );


                if (control) {

                    control.checked =
                        GISLayerState[
                            layerId
                        ];

                }

            }
        );

    },


    /* ------------------------------------------------------
       INITIALIZE
    ------------------------------------------------------ */

    initialize() {

        this.bindBaseMapControls();

        this.bindGISLayerControls();

        this.syncUI();

        this.initialized =
            true;

    }

};


/* ==========================================================
   LINEAR UI
========================================================== */

function updateLinearUI() {

    if (
        currentProject
    ) {

        const linearProject =
            $("linearProject");


        if (linearProject) {

            linearProject.textContent =
                currentProject.projectName ||
                "Công trình";

        }

    }


    const pointCode =
        $("pointCode");


    if (pointCode) {

        /*
         * No D001 synthetic value.
         */

        pointCode.textContent =
            "Chưa có";

    }

}


/* ==========================================================
   BUTTON BINDINGS
========================================================== */

function bindButtons() {


    /* ------------------------------------------------------
       SPLASH — START
       FIXED IN REV11
    ------------------------------------------------------ */

    const btnStart =
        $("btnStart");


    if (btnStart) {

        btnStart.addEventListener(
            "click",
            async () => {

                if (!dbReady) {

                    alert(
                        "Offline Database chưa sẵn sàng."
                    );

                    return;

                }


                try {

                    await loadProjectState();


                    renderProjectHome();


                    show(
                        "screenProjectHome"
                    );

                } catch (error) {

                    console.error(
                        "TGS Startup Error:",
                        error
                    );


                    alert(
                        "Không thể mở hồ sơ công trình."
                    );

                }

            }
        );

    }


    /* ------------------------------------------------------
       NEW PROJECT
    ------------------------------------------------------ */

    const btnNewProject =
        $("btnNewProject");


    if (btnNewProject) {

        btnNewProject.addEventListener(
            "click",
            () => {

                resetProjectForm();

                closeSavedProjects();

                show(
                    "screenProject"
                );

            }
        );

    }


    /* ------------------------------------------------------
       RESUME PROJECT
    ------------------------------------------------------ */

    const btnContinueDraft =
        $("btnContinueDraft");


    if (btnContinueDraft) {

        btnContinueDraft.addEventListener(
            "click",
            () => {

                resumeProject();

            }
        );

    }


    /* ------------------------------------------------------
       OPEN SAVED PROJECTS
    ------------------------------------------------------ */

    const btnOpenSavedProjects =
        $("btnOpenSavedProjects");


    if (btnOpenSavedProjects) {

        btnOpenSavedProjects.addEventListener(
            "click",
            () => {

                openSavedProjects();

            }
        );

    }


    /* ------------------------------------------------------
       CLOSE SAVED PROJECTS
    ------------------------------------------------------ */

    const btnCloseSaved =
        $("btnCloseSaved");


    if (btnCloseSaved) {

        btnCloseSaved.addEventListener(
            "click",
            () => {

                closeSavedProjects();

            }
        );

    }


    /* ------------------------------------------------------
       CREATE PROJECT
    ------------------------------------------------------ */

    const projectForm = $("projectForm");

    if (projectForm) {

        projectForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();
                createProject();

            }
        );

    } else {

        const btnCreateProject = $("btnCreateProject");

        if (btnCreateProject) {

            btnCreateProject.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    createProject();

                }
            );

        }

    }


    /* ------------------------------------------------------
       POINT SURVEY
    ------------------------------------------------------ */

    const btnPoint =
        $("btnPoint");


    if (btnPoint) {

        btnPoint.addEventListener(
            "click",
            () => {

                if (!currentProject) {

                    alert(
                        "Chưa có công trình."
                    );

                    return;

                }


                show(
                    "screenPoint"
                );

            }
        );

    }


    /* ------------------------------------------------------
       LINEAR SURVEY
    ------------------------------------------------------ */

    const btnLinear =
        $("btnLinear");


    if (btnLinear) {

        btnLinear.addEventListener(
            "click",
            () => {

                if (!currentProject) {

                    alert(
                        "Chưa có công trình."
                    );

                    return;

                }


                updateLinearUI();


                show(
                    "screenLinear"
                );

            }
        );

    }


    /* ------------------------------------------------------
       COMPLETE PROJECT
    ------------------------------------------------------ */

    const btnFinishProject =
        $("btnFinishProject");


    if (btnFinishProject) {

        btnFinishProject.addEventListener(
            "click",
            () => {

                completeProject();

            }
        );

    }


    /* ------------------------------------------------------
       SAVE PROJECT
    ------------------------------------------------------ */

    const btnSaveProject =
        $("btnSaveProject");


    if (btnSaveProject) {

        btnSaveProject.addEventListener(
            "click",
            () => {

                saveProject();

            }
        );

    }


    /* ------------------------------------------------------
       CONTINUE PROJECT
    ------------------------------------------------------ */

    const btnContinueProject =
        $("btnContinueProject");


    if (btnContinueProject) {

        btnContinueProject.addEventListener(
            "click",
            () => {

                backToSurveyFromCompletion();

            }
        );

    }


    /* ------------------------------------------------------
       BACK TO SURVEY FROM COMPLETE
    ------------------------------------------------------ */

    const btnReturnSurvey =
        $("btnReturnSurvey");


    if (btnReturnSurvey) {

        btnReturnSurvey.addEventListener(
            "click",
            () => {

                backToSurveyFromCompletion();

            }
        );

    }


    /* ------------------------------------------------------
       GENERIC BACK BUTTONS
    ------------------------------------------------------ */

    document
        .querySelectorAll(
            ".back-btn"
        )
        .forEach(
            button => {

                /*
                 * Specific buttons already have
                 * explicit handlers above.
                 *
                 * We only bind generic back buttons
                 * that have not already been handled.
                 */

                if (
                    button.dataset.tgsBackBound ===
                    "true"
                ) {

                    return;

                }


                button.dataset.tgsBackBound =
                    "true";


                button.addEventListener(
                    "click",
                    () => {

                        const currentScreen =
                            screens.find(
                                id => {

                                    const element =
                                        $(id);

                                    return (
                                        element &&
                                        element.classList.contains(
                                            "active"
                                        )
                                    );

                                }
                            );


                        if (
                            currentScreen ===
                            "screenProject"
                        ) {

                            show(
                                "screenProjectHome"
                            );

                            return;

                        }


                        show(
                            "screenSurveyHome"
                        );

                    }
                );

            }
        );


    /* ------------------------------------------------------
       MAP LOCATE
    ------------------------------------------------------ */

    const btnLocate =
        $("btnLocate");


    if (btnLocate) {

        btnLocate.addEventListener(
            "click",
            () => {

                MapEngine.locate();

            }
        );

    }


    /* ------------------------------------------------------
       MAP ZOOM IN
    ------------------------------------------------------ */

    const btnZoomIn =
        $("btnZoomIn");


    if (btnZoomIn) {

        btnZoomIn.addEventListener(
            "click",
            () => {

                MapEngine.zoomIn();

            }
        );

    }


    /* ------------------------------------------------------
       MAP ZOOM OUT
    ------------------------------------------------------ */

    const btnZoomOut =
        $("btnZoomOut");


    if (btnZoomOut) {

        btnZoomOut.addEventListener(
            "click",
            () => {

                MapEngine.zoomOut();

            }
        );

    }


    /* ------------------------------------------------------
       FIRST GPS
    ------------------------------------------------------ */

    const btnFirstGPS =
        $("btnFirstGPS");


    if (btnFirstGPS) {

        btnFirstGPS.addEventListener(
            "click",
            () => {

                if (
                    SmartGNSSState.active
                ) {

                    GPSManager.stopSmartMeasurement(
                        false
                    );

                    GPSManager.evaluateSmartMeasurement();

                    GPSManager.updateHUD();

                    SmartGNSSUI.update();

                    return;

                }

                GPSManager.startSmartMeasurement();

            }
        );

    }

}


/* ==========================================================
   STARTUP STATUS
========================================================== */

function updateStartupStatus() {

    const dbStatus = $("startupDbStatus");
    const gpsStatus = $("startupGpsStatus");
    const gisStatus = $("startupGisStatus");

    if (dbStatus) {
        dbStatus.textContent = dbReady ? "Sẵn sàng" : "Chờ kiểm tra";
    }

    if (gpsStatus) {
        gpsStatus.textContent = GPSManager.isSupported() ? "Sẵn sàng" : "Không hỗ trợ";
    }

    if (gisStatus) {
        gisStatus.textContent = "ArcGIS";
    }

}


/* ==========================================================
   APPLICATION BOOT
========================================================== */

window.addEventListener(
    "load",
    async () => {

        /*
         * Always begin on Splash.
         */

        show(
            "screenSplash"
        );

        updateStartupStatus();


        /*
         * IMPORTANT REV12 STARTUP ORDER
         *
         * UI bindings must not depend on IndexedDB
         * resolution or initialization.
         *
         * If the database is unavailable, the START
         * button must still respond and show a clear
         * database-not-ready message instead of becoming
         * a dead button.
         */

        bindButtons();


        /*
         * Resolve DB API after UI binding.
         */

        databaseApi =
            resolveDatabaseApi();


        if (!databaseApi) {

            console.error(
                "TGS: Database API not found."
            );

            alert(
                "Không tìm thấy Offline Database."
            );

            return;

        }


        /*
         * Initialize GIS controls.
         */

        MapLayerControl.initialize();


        /*
         * Initialize GPS HUD.
         */

        GPSManager.reset();


        /*
         * Initialize IndexedDB.
         */

        try {

            await databaseApi.initDatabase();


            dbReady =
                true;

            updateStartupStatus();


            /*
             * Load lifecycle state.
             *
             * We intentionally do not navigate away
             * from Splash automatically.
             *
             * The user must press Bắt đầu.
             */

            await loadProjectState();


            console.log(
                "======================================"
            );

            console.log(
                "TGS PLATFORM GENESIS 2.0"
            );

            console.log(
                "app.js REV14 — SMART GNSS ACQUISITION"
            );

            console.log(
                "Database : READY"
            );

            console.log(
                "Startup  : READY"
            );

            console.log(
                "ArcGIS   : READY"
            );

            console.log(
                "GPS      : READY"
            );

            console.log(
                "Synthetic GIS : DISABLED"
            );

            console.log(
                "======================================"
            );

        } catch (error) {

            dbReady =
                false;

            updateStartupStatus();


            console.error(
                "TGS Database Initialization Error:",
                error
            );


            alert(
                "Không thể khởi tạo bộ nhớ Offline."
            );

        }

    }
);


/* ==========================================================
   REV14 THREE-FILE RECONCILIATION + SMART GNSS

   UI button binding is intentionally independent from
   IndexedDB API resolution and initialization.

   This revision adds Smart GNSS acquisition only.

   It does NOT persist Survey Point data.
========================================================== */


/* ==========================================================
   QA STATUS
========================================================== */

function qaStatus() {

    return {

        revision:
            "REV14",

        database:
            dbReady,

        databaseApi:
            !!databaseApi,

        startup:
            !!$("btnStart"),

        startupHome:
            !!$("screenProjectHome"),

        projectForm:
            !!$("screenProject"),

        surveyHome:
            !!$("screenSurveyHome"),

        pointSurvey:
            !!$("screenPoint"),

        linearSurvey:
            !!$("screenLinear"),

        projectComplete:
            !!$("screenProjectComplete"),

        arcgis:
            true,

        gps:
            GPSManager.isSupported(),

        smartGNSS:
            {

                active:
                    SmartGNSSState.active,

                sampleCount:
                    SmartGNSSState.samples.length,

                targetSamples:
                    SmartGNSSState.targetSamples,

                medianAccuracy:
                    SmartGNSSState.medianAccuracy,

                stabilityMeters:
                    SmartGNSSState.stabilityMeters,

                quality:
                    SmartGNSSState.quality,

                ready:
                    SmartGNSSState.ready

            },

        syntheticGIS:
            false,

        currentProject:
            currentProject,

        draftProject:
            startupState.draftProject,

        savedProjectCount:
            startupState.savedProjects.length

    };

}


/* ==========================================================
   PUBLIC TGS QA API
========================================================== */

window.TGS = {

    qaStatus,

    GPS,

    GPSManager,

    SmartGNSSState,

    SmartGNSSUI,

    MapEngine,

    MapLayerControl,

    GISLayerState,

    DB:
        databaseApi

};


/* ==========================================================
   FINAL LOAD MESSAGE
========================================================== */

console.log(
    "TGS Genesis 2.0 app.js REV14 Loaded"
);
