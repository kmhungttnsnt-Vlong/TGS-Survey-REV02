/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   TGS02-WEB-LINEAR-004

   app.js
   REV13 — THREE-FILE RECONCILED BASELINE

   PURPOSE
   ----------------------------------------------------------
   1. Reconcile app.js with current index.html.
   2. Reconcile Project Lifecycle with DB v4.
   3. Fix START button failure.
   4. Ensure UI bindings are independent from DB initialization.
   5. Preserve ArcGIS as default map provider.
   6. Preserve real-device GPS read/display.
   7. Remove all synthetic GIS/demo objects.
   8. Keep GIS layer controls provider-independent.
   9. Do NOT implement Survey Point persistence yet.

   QA BASELINE
   ----------------------------------------------------------
   ✓ IndexedDB v4
   ✓ Project lifecycle
   ✓ Startup Home
   ✓ Resume Project
   ✓ Saved Project
   ✓ ArcGIS Default
   ✓ Real GPS read/display
   ✓ No synthetic GIS data
   ✓ Current index.html IDs
   ✓ Current DB v4 API

   IMPORTANT
   ----------------------------------------------------------
   This revision is a reconciliation release.

   It intentionally does NOT:
   - create survey points
   - save GPS points
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
            GPSState.acquiring
        ) {

            gpsText.textContent =
                "GPS: Đang xác định vị trí…";

            return;

        }


        if (
            GPSState.error
        ) {

            gpsText.textContent =
                "GPS: " +
                GPSState.error;

            return;

        }


        if (
            GPSState.available
        ) {

            gpsText.textContent =

                "Lat " +
                GPSState.latitude.toFixed(6) +

                " · Lon " +
                GPSState.longitude.toFixed(6) +

                " · ±" +
                Math.round(
                    GPSState.accuracy
                ) +
                " m";


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
       ACQUIRE CURRENT POSITION
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

            return;

        }


        if (
            GPSState.acquiring
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
       SUCCESS
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


        /*
         * Current baseline:
         *
         * GPS is displayed only.
         * It is NOT yet persisted as a
         * survey point.
         */

        MapEngine.showGPSPosition(

            GPSState.latitude,

            GPSState.longitude,

            GPSState.accuracy

        );


        /*
         * VN-2000 conversion is not yet implemented.
         * Therefore do not label geographic coordinates
         * as VN-2000.
         */

        const vnCoord =
            $("vnCoord");


        if (vnCoord) {

            vnCoord.textContent =
                "Chưa chuyển VN-2000";

        }

    },


    /* ------------------------------------------------------
       ERROR
    ------------------------------------------------------ */

    handleError(
        error
    ) {

        GPSState.available =
            false;

        GPSState.acquiring =
            false;


        switch (
            error.code
        ) {

            case 1:

                GPSState.error =
                    "Người dùng từ chối quyền GPS.";

                break;


            case 2:

                GPSState.error =
                    "Thiết bị không xác định được vị trí.";

                break;


            case 3:

                GPSState.error =
                    "GPS hết thời gian chờ.";

                break;


            default:

                GPSState.error =
                    error.message ||
                    "Không xác định.";

                break;

        }


        this.updateHUD();


        console.warn(
            "TGS GPS Error:",
            error
        );

    },


    /* ------------------------------------------------------
       RESET
    ------------------------------------------------------ */

    reset() {

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


        MapEngine.resetGPSVisuals();


        this.updateHUD();


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
   GPS COMPATIBILITY ALIAS
========================================================== */

const GPS = {

    readCurrentLocation() {

        GPSManager.acquire();

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

                GPSManager.acquire();

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
                "app.js REV13 — THREE-FILE RECONCILED BASELINE"
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
   REV13 THREE-FILE RECONCILIATION

   UI button binding is intentionally independent from
   IndexedDB API resolution and initialization.

   This revision does NOT change project data, GIS data,
   GPS persistence, Survey Point persistence, or any
   subsequent survey implementation gate.
========================================================== */


/* ==========================================================
   QA STATUS
========================================================== */

function qaStatus() {

    return {

        revision:
            "REV13",

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
    "TGS Genesis 2.0 app.js REV13 Loaded"
);
