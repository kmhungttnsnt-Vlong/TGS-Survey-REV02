/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV09

   GIS-02.1 — REAL GPS READ

   Purpose:
   - Preserve verified Project Lifecycle.
   - Preserve ArcGIS default base map.
   - Preserve GIS Layer Control.
   - Preserve clean real-project map.
   - Read REAL device GPS.
   - Display GPS position / accuracy / altitude / time.
   - DO NOT save GPS to IndexedDB in this revision.
   - DO NOT create GIS Object in this revision.
   - DO NOT create demo/synthetic GIS data.

   GIS-02.1 flow:

       Device GPS
            ↓
       Browser Geolocation API
            ↓
       GPSManager
            ↓
       GPS HUD
            ↓
       QA

   Later:

       GPS
        ↓
       Confirm
        ↓
       GIS Object
        ↓
       IndexedDB
========================================================== */


/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentProject = null;

let draftProject = null;

let savedProjects = [];

let dbReady = false;


/* ==========================================================
   DOM HELPER
========================================================== */

const $ = (id) => document.getElementById(id);


/* ==========================================================
   LEAFLET DEFAULT ICON
========================================================== */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"

});


/* ==========================================================
   SCREEN MANAGER
========================================================== */

const screens = [

  "screenSplash",
  "screenProject",
  "screenSurveyHome",
  "screenPoint",
  "screenLinear",
  "screenProjectComplete"

];


function show(screenId) {

  screens.forEach(id => {

    const el = $(id);

    if (el) {

      el.classList.remove("active");

    }

  });


  const target = $(screenId);


  if (target) {

    target.classList.add("active");

  }


  if (screenId === "screenLinear") {

    setTimeout(() => {

      MapEngine.initialize();

    }, 200);

  }

}


/* ==========================================================
   MAP PROVIDERS
========================================================== */

const MapProviders = {

  arcgis: {

    id:
      "arcgis",

    name:
      "ArcGIS World Street Map",

    type:
      "tile",

    enabled:
      true,

    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",

    options: {

      maxZoom:
        22,

      attribution:
        "Tiles © Esri — Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), OpenStreetMap contributors and the GIS User Community"

    }

  },


  google: {

    id:
      "google",

    name:
      "Google Maps",

    type:
      "google-maps-platform",

    enabled:
      false,

    status:
      "PLANNED",

    note:
      "Google Maps integration will use the official Google Maps Platform mechanism."

  }

};


/* ==========================================================
   GIS LAYER REGISTRY
========================================================== */

const GISLayerRegistry = {

  surveyPoint: {

    id:
      "surveyPoint",

    name:
      "Điểm khảo sát",

    category:
      "survey",

    visible:
      true,

    layer:
      null

  },


  surveyRoute: {

    id:
      "surveyRoute",

    name:
      "Tuyến khảo sát",

    category:
      "survey",

    visible:
      true,

    layer:
      null

  },


  pipe: {

    id:
      "pipe",

    name:
      "Ống",

    category:
      "network",

    visible:
      false,

    layer:
      null

  },


  valve: {

    id:
      "valve",

    name:
      "Van",

    category:
      "network",

    visible:
      false,

    layer:
      null

  },


  tee: {

    id:
      "tee",

    name:
      "Tê",

    category:
      "network",

    visible:
      false,

    layer:
      null

  },


  elbow: {

    id:
      "elbow",

    name:
      "Cút",

    category:
      "network",

    visible:
      false,

    layer:
      null

  },


  waterStation: {

    id:
      "waterStation",

    name:
      "Trạm cấp nước",

    category:
      "facility",

    visible:
      false,

    layer:
      null

  },


  customerMeter: {

    id:
      "customerMeter",

    name:
      "Đồng hồ khách hàng",

    category:
      "customer",

    visible:
      false,

    layer:
      null

  }

};


/* ==========================================================
   RESET GIS LAYER REGISTRY
========================================================== */

function resetGISLayerRegistry() {

  Object.keys(
    GISLayerRegistry
  ).forEach(layerId => {

    GISLayerRegistry[layerId].layer =
      null;

  });

}


/* ==========================================================
   GPS STATE
========================================================== */

const GPSState = {

  available:
    false,

  acquiring:
    false,

  latitude:
    null,

  longitude:
    null,

  accuracy:
    null,

  altitude:
    null,

  altitudeAccuracy:
    null,

  heading:
    null,

  speed:
    null,

  timestamp:
    null,

  error:
    null

};


/* ==========================================================
   GPS MANAGER
========================================================== */

const GPSManager = {


  /* --------------------------------------------------------
     CHECK BROWSER SUPPORT
  -------------------------------------------------------- */

  isSupported() {

    return (
      "geolocation" in navigator
    );

  },


  /* --------------------------------------------------------
     RESET
  -------------------------------------------------------- */

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

    GPSState.altitudeAccuracy =
      null;

    GPSState.heading =
      null;

    GPSState.speed =
      null;

    GPSState.timestamp =
      null;

    GPSState.error =
      null;

  },


  /* --------------------------------------------------------
     FORMAT NUMBER
  -------------------------------------------------------- */

  formatNumber(
    value,
    decimals = 6
  ) {

    if (
      value === null ||
      value === undefined ||
      Number.isNaN(value)
    ) {

      return "--";

    }


    return Number(value)
      .toFixed(decimals);

  },


  /* --------------------------------------------------------
     FORMAT ACCURACY
  -------------------------------------------------------- */

  formatAccuracy(
    accuracy
  ) {

    if (
      accuracy === null ||
      accuracy === undefined ||
      Number.isNaN(accuracy)
    ) {

      return "--";

    }


    return `${Math.round(accuracy)} m`;

  },


  /* --------------------------------------------------------
     FORMAT ALTITUDE
  -------------------------------------------------------- */

  formatAltitude(
    altitude
  ) {

    if (
      altitude === null ||
      altitude === undefined ||
      Number.isNaN(altitude)
    ) {

      return "--";

    }


    return `${altitude.toFixed(1)} m`;

  },


  /* --------------------------------------------------------
     UPDATE HUD
  -------------------------------------------------------- */

  updateHUD() {

    const gpsText =
      $("gpsText");


    if (!gpsText) {

      return;

    }


    if (
      GPSState.acquiring
    ) {

      gpsText.textContent =
        "Đang lấy GPS...";

      return;

    }


    if (
      GPSState.error
    ) {

      gpsText.textContent =
        `GPS lỗi: ${GPSState.error}`;

      return;

    }


    if (
      !GPSState.available
    ) {

      gpsText.textContent =
        "GPS chưa lấy";

      return;

    }


    gpsText.textContent =
      [
        `Lat ${this.formatNumber(GPSState.latitude, 6)}`,
        `Lon ${this.formatNumber(GPSState.longitude, 6)}`,
        `±${this.formatAccuracy(GPSState.accuracy)}`
      ].join(" • ");

  },


  /* --------------------------------------------------------
     UPDATE MAP
  -------------------------------------------------------- */

  updateMap() {

    if (
      !GPSState.available
    ) {

      return;

    }


    if (
      !MapEngine.map
    ) {

      return;

    }


    const lat =
      GPSState.latitude;


    const lon =
      GPSState.longitude;


    if (
      lat === null ||
      lon === null
    ) {

      return;

    }


    const position =
      [
        lat,
        lon
      ];


    /*
     * IMPORTANT:
     *
     * This is ONLY a temporary GPS position marker.
     *
     * It is NOT a GIS Object.
     * It is NOT saved to IndexedDB.
     * It is NOT a survey point.
     *
     * The marker will be replaced by the real
     * survey-object workflow in GIS-02.2.
     */

    MapEngine.showGPSPosition(
      position
    );

  },


  /* --------------------------------------------------------
     SUCCESS
  -------------------------------------------------------- */

  handleSuccess(
    position
  ) {

    const coords =
      position.coords;


    GPSState.available =
      true;

    GPSState.acquiring =
      false;

    GPSState.error =
      null;


    GPSState.latitude =
      coords.latitude;


    GPSState.longitude =
      coords.longitude;


    GPSState.accuracy =
      coords.accuracy;


    GPSState.altitude =
      coords.altitude;


    GPSState.altitudeAccuracy =
      coords.altitudeAccuracy;


    GPSState.heading =
      coords.heading;


    GPSState.speed =
      coords.speed;


    GPSState.timestamp =
      position.timestamp;


    this.updateHUD();

    this.updateMap();


    console.log(
      "TGS GPS — REAL POSITION:",
      {
        latitude:
          GPSState.latitude,

        longitude:
          GPSState.longitude,

        accuracy:
          GPSState.accuracy,

        altitude:
          GPSState.altitude,

        timestamp:
          new Date(
            GPSState.timestamp
          ).toISOString()
      }
    );

  },


  /* --------------------------------------------------------
     ERROR
  -------------------------------------------------------- */

  handleError(
    error
  ) {

    GPSState.acquiring =
      false;

    GPSState.available =
      false;


    let message =
      "Không xác định";


    switch (
      error.code
    ) {

      case 1:

        message =
          "Bạn chưa cấp quyền vị trí.";

        break;


      case 2:

        message =
          "Thiết bị không xác định được vị trí.";

        break;


      case 3:

        message =
          "GPS hết thời gian chờ.";

        break;


      default:

        message =
          error.message ||
          "Không xác định";

        break;

    }


    GPSState.error =
      message;


    this.updateHUD();


    console.error(
      "TGS GPS Error:",
      error
    );

  },


  /* --------------------------------------------------------
     ACQUIRE CURRENT POSITION
  -------------------------------------------------------- */

  acquire() {

    if (
      !this.isSupported()
    ) {

      GPSState.error =
        "Trình duyệt không hỗ trợ GPS.";

      this.updateHUD();

      alert(
        "Thiết bị/trình duyệt không hỗ trợ GPS."
      );

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

  }

};


/* ==========================================================
   PROJECT LIFECYCLE HELPERS
========================================================== */

function isDraftProject(
  project
) {

  if (!project) {

    return false;

  }


  if (
    project.status === "DRAFT" ||
    project.status === "IN_PROGRESS"
  ) {

    return true;

  }


  if (
    project.status === "COMPLETED" &&
    project.isSaved !== true
  ) {

    return true;

  }


  if (
    project.isSaved === false
  ) {

    return true;

  }


  if (
    project.completed === false &&
    project.isSaved !== true
  ) {

    return true;

  }


  return false;

}


function isSavedProject(
  project
) {

  if (!project) {

    return false;

  }


  if (
    project.status === "SAVED"
  ) {

    return true;

  }


  if (
    project.isSaved === true
  ) {

    return true;

  }


  const hasLifecycleFields =

    Object.prototype.hasOwnProperty.call(
      project,
      "status"
    ) ||

    Object.prototype.hasOwnProperty.call(
      project,
      "isSaved"
    ) ||

    Object.prototype.hasOwnProperty.call(
      project,
      "completed"
    );


  if (
    !hasLifecycleFields
  ) {

    return true;

  }


  return false;

}


/* ==========================================================
   PROJECT HOME
========================================================== */

function updateProjectHome() {

  const notice =
    $("projectDraftNotice");

  const resumeButton =
    $("btnResumeProject");

  const savedList =
    $("savedProjectList");

  const savedItems =
    $("savedProjectItems");


  if (notice) {

    notice.style.display =
      draftProject
        ? ""
        : "none";

  }


  if (resumeButton) {

    resumeButton.style.display =
      draftProject
        ? ""
        : "none";

  }


  if (savedList) {

    savedList.style.display =
      savedProjects.length > 0
        ? ""
        : "none";

  }


  if (!savedItems) {

    return;

  }


  savedItems.innerHTML =
    "";


  if (
    savedProjects.length === 0
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "empty";


    empty.textContent =
      "Chưa có công trình đã lưu.";


    savedItems.appendChild(
      empty
    );


    return;

  }


  savedProjects.forEach(
    project => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "saved-project-item";


      button.dataset.projectId =
        project.projectId;


      const name =
        document.createElement(
          "strong"
        );


      name.textContent =
        project.projectName ||
        "Công trình chưa đặt tên";


      const meta =
        document.createElement(
          "small"
        );


      meta.textContent =
        [
          project.projectCode,
          project.location
        ]
          .filter(Boolean)
          .join(" • ");


      button.appendChild(
        name
      );


      button.appendChild(
        meta
      );


      button.onclick =
        () =>
          openSavedProject(
            project.projectId
          );


      savedItems.appendChild(
        button
      );

    }
  );

}


/* ==========================================================
   LOAD PROJECT STATE
========================================================== */

async function loadProjectState() {

  if (!dbReady) {

    return;

  }


  try {

    let projects =
      await DB.getAllProjects();


    if (
      !Array.isArray(projects)
    ) {

      projects = [];

    }


    draftProject =
      projects.find(
        project =>
          isDraftProject(
            project
          )
      ) || null;


    savedProjects =
      projects.filter(
        project =>
          isSavedProject(
            project
          )
      );


    updateProjectHome();

  } catch (error) {

    console.error(
      "TGS Project State Error:",
      error
    );

  }

}


/* ==========================================================
   UPDATE CURRENT PROJECT UI
========================================================== */

function updateHome() {

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
      "Hoàn thành khảo sát";

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

        input.value =
          "";

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


  const name =
    $("projectName")
      ? $("projectName")
          .value
          .trim()
      : "";


  const code =
    $("projectCode")
      ? $("projectCode")
          .value
          .trim()
      : "";


  if (
    name === "" ||
    code === ""
  ) {

    alert(
      "Nhập tên và mã công trình."
    );

    return;

  }


  try {

    currentProject =
      await DB.createProject({

        projectName:
          name,

        projectCode:
          code,

        location:
          $("projectLocation")
            ? $("projectLocation")
                .value
                .trim()
            : "",

        organization:
          $("organization")
            ? $("organization")
                .value
                .trim()
            : "",

        status:
          "IN_PROGRESS",

        completed:
          false,

        isSaved:
          false

      });


    resetGISLayerRegistry();

    GPSManager.reset();

    GPSManager.updateHUD();

    updateHome();

    await loadProjectState();

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
   RESUME PROJECT
========================================================== */

async function resumeProject() {

  if (!draftProject) {

    return;

  }


  currentProject =
    draftProject;


  resetGISLayerRegistry();

  GPSManager.reset();

  GPSManager.updateHUD();

  updateHome();

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

    return;

  }


  try {

    const project =
      await DB.getProject(
        projectId
      );


    if (!project) {

      alert(
        "Không tìm thấy công trình."
      );


      await loadProjectState();

      return;

    }


    currentProject =
      project;


    resetGISLayerRegistry();

    GPSManager.reset();

    GPSManager.updateHUD();

    updateHome();

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


  currentProject = {

    ...currentProject,

    status:
      "COMPLETED",

    completed:
      true,

    isSaved:
      false,

    completedAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };


  try {

    await DB.updateProject(
      currentProject
    );


    await loadProjectState();

    updateHome();

    updateCompletionScreen();

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
   UPDATE COMPLETION SCREEN
========================================================== */

function updateCompletionScreen() {

  if (!currentProject) {

    return;

  }


  const name =
    $("completeProjectName");


  if (name) {

    name.textContent =
      currentProject.projectName ||
      "Chưa có công trình";

  }


  const code =
    $("completeProjectCode");


  if (code) {

    code.textContent =
      currentProject.projectCode ||
      "";

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


  currentProject = {

    ...currentProject,

    status:
      "SAVED",

    completed:
      true,

    isSaved:
      true,

    savedAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };


  try {

    await DB.updateProject(
      currentProject
    );


    await loadProjectState();

    updateHome();

    show(
      "screenProject"
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

  map:
    null,

  marker:
    null,

  gpsMarker:
    null,

  gpsAccuracyCircle:
    null,

  baseLayer:
    null,

  activeProvider:
    "arcgis",

  defaultLocation: [

    10.762622,
    106.660172

  ],


  /* --------------------------------------------------------
     INITIALIZE
  -------------------------------------------------------- */

  initialize() {

    if (this.map) {

      setTimeout(
        () => {

          this.map.invalidateSize();

        },
        50
      );


      return;

    }


    const mapElement =
      $("map");


    if (!mapElement) {

      console.error(
        "TGS GIS: #map element was not found."
      );

      return;

    }


    resetGISLayerRegistry();


    this.map =
      L.map(
        "map",
        {
          zoomControl:
            false
        }
      )
      .setView(
        this.defaultLocation,
        18
      );


    this.setBaseMap(
      "arcgis"
    );


    /*
     * IMPORTANT:
     *
     * No demo marker.
     * No D001 marker.
     * No synthetic GIS object.
     *
     * GPS position is created only after the user
     * explicitly requests GPS.
     */


    this.applyAllGISLayerVisibility();


    console.log(
      "TGS GIS initialized:",
      {

        engine:
          "Leaflet",

        provider:
          this.activeProvider,

        projectId:
          currentProject
            ? currentProject.projectId
            : null,

        mode:
          "REAL_PROJECT",

        syntheticData:
          false

      }
    );

  },


  /* --------------------------------------------------------
     SET BASE MAP
  -------------------------------------------------------- */

  setBaseMap(
    providerId
  ) {

    if (!this.map) {

      console.warn(
        "TGS GIS: Map has not been initialized."
      );

      return false;

    }


    const provider =
      MapProviders[
        providerId
      ];


    if (!provider) {

      console.error(
        "TGS GIS: Unknown map provider:",
        providerId
      );

      return false;

    }


    if (
      provider.enabled === false
    ) {

      console.warn(
        `TGS GIS: Provider "${providerId}" is not active yet.`
      );

      return false;

    }


    if (this.baseLayer) {

      this.map.removeLayer(
        this.baseLayer
      );


      this.baseLayer =
        null;

    }


    if (
      provider.type === "tile"
    ) {

      this.baseLayer =
        L.tileLayer(
          provider.url,
          provider.options
        );


      this.baseLayer.addTo(
        this.map
      );


      this.activeProvider =
        providerId;


      console.log(
        "TGS GIS Base Map:",
        provider.name
      );


      return true;

    }


    console.warn(
      "TGS GIS: Provider type not implemented:",
      provider.type
    );


    return false;

  },


  /* --------------------------------------------------------
     SHOW TEMPORARY GPS POSITION
  -------------------------------------------------------- */

  showGPSPosition(
    position
  ) {

    if (!this.map) {

      return;

    }


    const lat =
      position[0];


    const lon =
      position[1];


    /* ------------------------------------------------------
       Temporary GPS marker
    ------------------------------------------------------ */

    if (!this.gpsMarker) {

      this.gpsMarker =
        L.circleMarker(
          position,
          {

            radius:
              8,

            weight:
              3,

            fillOpacity:
              0.85

          }
        );


      this.gpsMarker.addTo(
        this.map
      );

    } else {

      this.gpsMarker.setLatLng(
        position
      );

    }


    /* ------------------------------------------------------
       Accuracy circle
    ------------------------------------------------------ */

    if (
      GPSState.accuracy !== null &&
      !Number.isNaN(
        GPSState.accuracy
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
                GPSState.accuracy,

              weight:
                1,

              fillOpacity:
                0.08

            }
          );


        this.gpsAccuracyCircle.addTo(
          this.map
        );

      } else {

        this.gpsAccuracyCircle.setLatLng(
          position
        );


        this.gpsAccuracyCircle.setRadius(
          GPSState.accuracy
        );

      }

    }


    /* ------------------------------------------------------
       Move map to GPS position
    ------------------------------------------------------ */

    this.map.flyTo(
      position,
      Math.max(
        this.map.getZoom(),
        18
      ),
      {

        duration:
          0.8

      }
    );


    console.log(
      "TGS GPS temporary map position:",
      {
        latitude:
          lat,

        longitude:
          lon,

        accuracy:
          GPSState.accuracy
      }
    );

  },


  /* --------------------------------------------------------
     GET ACTIVE PROVIDER
  -------------------------------------------------------- */

  getActiveProvider() {

    return this.activeProvider;

  },


  /* --------------------------------------------------------
     ADD GIS LAYER
  -------------------------------------------------------- */

  addGISLayer(
    layerId,
    leafletLayer
  ) {

    const registry =
      GISLayerRegistry[
        layerId
      ];


    if (!registry) {

      console.error(
        "TGS GIS: Unknown GIS layer:",
        layerId
      );

      return false;

    }


    if (!leafletLayer) {

      console.error(
        "TGS GIS: Invalid Leaflet layer:",
        layerId
      );

      return false;

    }


    registry.layer =
      leafletLayer;


    if (
      registry.visible &&
      this.map
    ) {

      leafletLayer.addTo(
        this.map
      );

    }


    return true;

  },


  /* --------------------------------------------------------
     SHOW GIS LAYER
  -------------------------------------------------------- */

  showGISLayer(
    layerId
  ) {

    const registry =
      GISLayerRegistry[
        layerId
      ];


    if (!registry) {

      return false;

    }


    registry.visible =
      true;


    if (
      registry.layer &&
      this.map
    ) {

      if (
        !this.map.hasLayer(
          registry.layer
        )
      ) {

        registry.layer.addTo(
          this.map
        );

      }

    }


    return true;

  },


  /* --------------------------------------------------------
     HIDE GIS LAYER
  -------------------------------------------------------- */

  hideGISLayer(
    layerId
  ) {

    const registry =
      GISLayerRegistry[
        layerId
      ];


    if (!registry) {

      return false;

    }


    registry.visible =
      false;


    if (
      registry.layer &&
      this.map
    ) {

      if (
        this.map.hasLayer(
          registry.layer
        )
      ) {

        this.map.removeLayer(
          registry.layer
        );

      }

    }


    return true;

  },


  /* --------------------------------------------------------
     TOGGLE GIS LAYER
  -------------------------------------------------------- */

  toggleGISLayer(
    layerId
  ) {

    const registry =
      GISLayerRegistry[
        layerId
      ];


    if (!registry) {

      console.error(
        "TGS GIS: Unknown GIS layer:",
        layerId
      );

      return false;

    }


    if (
      registry.visible
    ) {

      return this.hideGISLayer(
        layerId
      );

    }


    return this.showGISLayer(
      layerId
    );

  },


  /* --------------------------------------------------------
     APPLY GIS VISIBILITY
  -------------------------------------------------------- */

  applyAllGISLayerVisibility() {

    if (!this.map) {

      return;

    }


    Object.keys(
      GISLayerRegistry
    ).forEach(
      layerId => {

        const registry =
          GISLayerRegistry[
            layerId
          ];


        if (!registry.layer) {

          return;

        }


        if (
          registry.visible
        ) {

          if (
            !this.map.hasLayer(
              registry.layer
            )
          ) {

            registry.layer.addTo(
              this.map
            );

          }

        } else {

          if (
            this.map.hasLayer(
              registry.layer
            )
          ) {

            this.map.removeLayer(
              registry.layer
            );

          }

        }

      }
    );

  },


  /* --------------------------------------------------------
     ZOOM IN
  -------------------------------------------------------- */

  zoomIn() {

    if (this.map) {

      this.map.zoomIn();

    }

  },


  /* --------------------------------------------------------
     ZOOM OUT
  -------------------------------------------------------- */

  zoomOut() {

    if (this.map) {

      this.map.zoomOut();

    }

  },


  /* --------------------------------------------------------
     LOCATE — CURRENT GPS
  -------------------------------------------------------- */

  locate() {

    if (
      GPSState.available
    ) {

      this.showGPSPosition(

        [
          GPSState.latitude,
          GPSState.longitude
        ]

      );


      return;

    }


    GPSManager.acquire();

  }

};


/* ==========================================================
   MAP LAYER CONTROL
========================================================== */

const MapLayerControl = {


  /* --------------------------------------------------------
     BASE MAP
  -------------------------------------------------------- */

  bindBaseMapControls() {

    const controls =
      document.querySelectorAll(
        'input[name="baseMap"]'
      );


    controls.forEach(
      control => {

        control.addEventListener(
          "change",
          () => {

            const providerId =
              control.value;


            if (
              providerId === "arcgis"
            ) {

              MapEngine.setBaseMap(
                "arcgis"
              );


              return;

            }


            console.log(
              "TGS GIS: Google provider is prepared but not activated."
            );

          }
        );

      }
    );

  },


  /* --------------------------------------------------------
     GIS LAYERS
  -------------------------------------------------------- */

  bindGISLayerControls() {

    const controls =
      document.querySelectorAll(
        "[data-layer] input[type='checkbox']"
      );


    controls.forEach(
      control => {

        const option =
          control.closest(
            "[data-layer]"
          );


        if (!option) {

          return;

        }


        const layerId =
          option.dataset.layer;


        control.addEventListener(
          "change",
          () => {

            MapEngine.toggleGISLayer(
              layerId
            );


            console.log(
              "TGS GIS Layer:",
              layerId,

              GISLayerRegistry[
                layerId
              ]
                ? GISLayerRegistry[
                    layerId
                  ].visible
                : null

            );

          }
        );

      }
    );

  },


  /* --------------------------------------------------------
     SYNC UI
  -------------------------------------------------------- */

  syncUI() {

    Object.keys(
      GISLayerRegistry
    ).forEach(
      layerId => {

        const registry =
          GISLayerRegistry[
            layerId
          ];


        const option =
          document.querySelector(
            `[data-layer="${layerId}"] input[type="checkbox"]`
          );


        if (option) {

          option.checked =
            registry.visible;

        }

      }
    );

  },


  /* --------------------------------------------------------
     INITIALIZE
  -------------------------------------------------------- */

  initialize() {

    this.bindBaseMapControls();

    this.bindGISLayerControls();

    this.syncUI();

  }

};


/* ==========================================================
   BUTTON EVENTS
========================================================== */

function bindButtons() {


  /* --------------------------------------------------------
     START
  -------------------------------------------------------- */

  const btnStart =
    $("btnStart");


  if (btnStart) {

    btnStart.onclick =
      () => {

        updateProjectHome();

        show(
          "screenProject"
        );

      };

  }


  /* --------------------------------------------------------
     NEW PROJECT
  -------------------------------------------------------- */

  const btnNewProject =
    $("btnNewProject");


  if (btnNewProject) {

    btnNewProject.onclick =
      () => {

        resetProjectForm();

        show(
          "screenProject"
        );

      };

  }


  /* --------------------------------------------------------
     RESUME PROJECT
  -------------------------------------------------------- */

  const btnResumeProject =
    $("btnResumeProject");


  if (btnResumeProject) {

    btnResumeProject.onclick =
      resumeProject;

  }


  /* --------------------------------------------------------
     OPEN SAVED PROJECTS
  -------------------------------------------------------- */

  const btnOpenSavedProjects =
    $("btnOpenSavedProjects");


  if (btnOpenSavedProjects) {

    btnOpenSavedProjects.onclick =
      () => {

        updateProjectHome();

        show(
          "screenProject"
        );

      };

  }


  /* --------------------------------------------------------
     CREATE PROJECT
  -------------------------------------------------------- */

  const btnCreateProject =
    $("btnCreateProject");


  if (btnCreateProject) {

    btnCreateProject.onclick =
      createProject;

  }


  /* --------------------------------------------------------
     POINT SURVEY
  -------------------------------------------------------- */

  const btnPoint =
    $("btnPoint");


  if (btnPoint) {

    btnPoint.onclick =
      () => {

        show(
          "screenPoint"
        );

      };

  }


  /* --------------------------------------------------------
     LINEAR SURVEY
  -------------------------------------------------------- */

  const btnLinear =
    $("btnLinear");


  if (btnLinear) {

    btnLinear.onclick =
      () => {

        show(
          "screenLinear"
        );

      };

  }


  /* --------------------------------------------------------
     COMPLETE PROJECT
  -------------------------------------------------------- */

  const btnCompleteProject =
    $("btnCompleteProject");


  if (btnCompleteProject) {

    btnCompleteProject.onclick =
      completeProject;

  }


  /* --------------------------------------------------------
     SAVE PROJECT
  -------------------------------------------------------- */

  const btnSaveProject =
    $("btnSaveProject");


  if (btnSaveProject) {

    btnSaveProject.onclick =
      saveProject;

  }


  /* --------------------------------------------------------
     CONTINUE PROJECT
  -------------------------------------------------------- */

  const btnContinueProject =
    $("btnContinueProject");


  if (btnContinueProject) {

    btnContinueProject.onclick =
      backToSurveyFromCompletion;

  }


  /* --------------------------------------------------------
     BACK BUTTON
  -------------------------------------------------------- */

  document
    .querySelectorAll(
      ".back-btn"
    )
    .forEach(
      btn => {

        btn.onclick =
          () => {

            show(
              "screenSurveyHome"
            );

          };

      }
    );


  /* --------------------------------------------------------
     MAP ZOOM IN
  -------------------------------------------------------- */

  const btnZoomIn =
    $("btnZoomIn");


  if (btnZoomIn) {

    btnZoomIn.onclick =
      () => {

        MapEngine.zoomIn();

      };

  }


  /* --------------------------------------------------------
     MAP ZOOM OUT
  -------------------------------------------------------- */

  const btnZoomOut =
    $("btnZoomOut");


  if (btnZoomOut) {

    btnZoomOut.onclick =
      () => {

        MapEngine.zoomOut();

      };

  }


  /* --------------------------------------------------------
     MAP LOCATE
  -------------------------------------------------------- */

  const btnLocate =
    $("btnLocate");


  if (btnLocate) {

    btnLocate.onclick =
      () => {

        GPSManager.acquire();

      };

  }


  /* --------------------------------------------------------
     FIRST GPS — REAL GPS
  -------------------------------------------------------- */

  const btnFirstGPS =
    $("btnFirstGPS");


  if (btnFirstGPS) {

    btnFirstGPS.onclick =
      () => {

        GPSManager.acquire();

      };

  }

}


/* ==========================================================
   BOOT
========================================================== */

window.addEventListener(
  "load",
  async () => {

    show(
      "screenSplash"
    );


    bindButtons();


    MapLayerControl.initialize();


    GPSManager.reset();

    GPSManager.updateHUD();


    try {

      await DB.initDatabase();


      dbReady =
        true;


      await loadProjectState();


      console.log(
        "TGS WebApp boot:",
        {

          database:
            "READY",

          projectMode:
            "REAL_PROJECT",

          syntheticGIS:
            false,

          gps:
            "READY_FOR_REAL_DEVICE_TEST"

        }
      );


    } catch (error) {

      console.error(
        "TGS Offline Database Error:",
        error
      );


      alert(
        "Không thể khởi tạo bộ nhớ Offline."
      );

    }

  }
);
