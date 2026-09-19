/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV06

   PROJECT LIFECYCLE + GIS LAB

   REV06 CHANGE
   ----------------------------------------------------------
   1. Use DB.getAllProjects().
   2. Detect unfinished project from all projects.
   3. Load ALL saved projects.
   4. Support legacy projects without status.
   5. Keep current GIS / ArcGIS implementation unchanged.
   6. Keep D001.
   7. Keep GIS Layer Control.
   8. Keep GIS LAB demo layers.
   9. Do not delete or reset existing projects.

   PROJECT LIFECYCLE

      APP OPEN
         │
         └── Hồ sơ công trình
                │
                ├── Công trình đang dở
                │      └── Tiếp tục
                │
                ├── Tạo công trình mới
                │
                └── Mở lại công trình đã lưu
                       └── Danh sách tất cả hồ sơ

   IMPORTANT

   - Legacy projects without status are treated as SAVED.
   - New projects are created as IN_PROGRESS.
   - No automatic project opening.
   - GIS LAB data remains TEST DATA.
========================================================== */


/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentProject = null;

let allProjects = [];

let draftProject = null;

let savedProjects = [];

let dbReady = false;


/* ==========================================================
   DOM HELPER
========================================================== */

const $ = (id) => {

  return document.getElementById(id);

};


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

  "screenProjectHome",

  "screenProject",

  "screenSurveyHome",

  "screenPoint",

  "screenLinear"

];


function show(screenId) {

  screens.forEach(id => {

    const element = $(id);

    if (element) {

      element.classList.remove("active");

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
   PROJECT STATUS
========================================================== */

const ProjectStatus = {

  DRAFT:
    "DRAFT",

  IN_PROGRESS:
    "IN_PROGRESS",

  COMPLETED:
    "COMPLETED",

  SAVED:
    "SAVED"

};


/* ==========================================================
   PROJECT STATUS HELPERS
========================================================== */

function isDraftProject(project) {

  if (!project) {

    return false;

  }


  const status =
    project.status;


  if (
    status === ProjectStatus.DRAFT ||
    status === ProjectStatus.IN_PROGRESS
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
    project.status
  ) {

    return true;

  }


  return false;

}


/* ----------------------------------------------------------
   Legacy projects:

   Nếu project cũ không có status/isSaved/completed,
   project vẫn được coi là hồ sơ đã lưu.

   Điều này bảo vệ dữ liệu Tân An và các hồ sơ cũ.
---------------------------------------------------------- */

function isSavedProject(project) {

  if (!project) {

    return false;

  }


  if (isDraftProject(project)) {

    return false;

  }


  if (
    project.status === ProjectStatus.SAVED ||
    project.status === ProjectStatus.COMPLETED
  ) {

    return true;

  }


  if (
    project.isSaved === true ||
    project.completed === true
  ) {

    return true;

  }


  /*
     Legacy project:
     no lifecycle fields.
  */

  return true;

}


/* ==========================================================
   PROJECT SORT
========================================================== */

function getProjectTime(project) {

  if (!project) {

    return 0;

  }


  const value =
    project.updatedAt ||
    project.createdAt;


  const time =
    new Date(value || 0).getTime();


  return Number.isNaN(time)
    ? 0
    : time;

}


/* ==========================================================
   PROJECT HOME STATE
========================================================== */

function updateProjectHome() {

  const notice =
    $("projectDraftNotice");


  const resumeButton =
    $("btnResumeProject");


  /*
     Draft / unfinished project
  */

  if (
    draftProject &&
    notice
  ) {

    notice.hidden = false;


    if (resumeButton) {

      resumeButton.hidden = false;

    }

  } else if (notice) {

    notice.hidden = true;

  }


  /*
     Saved project area
  */

  updateSavedProjectHome();

}


/* ==========================================================
   RENDER ALL SAVED PROJECTS
========================================================== */

function updateSavedProjectHome() {

  const items =
    $("savedProjectItems");


  if (!items) {

    return;

  }


  items.innerHTML = "";


  /*
     No saved projects
  */

  if (
    savedProjects.length === 0
  ) {

    const empty =
      document.createElement("div");


    empty.className =
      "saved-project-empty";


    empty.textContent =
      "Chưa có công trình đã lưu.";


    items.appendChild(
      empty
    );


    return;

  }


  /*
     Render every saved project
  */

  savedProjects.forEach(project => {

    const card =
      document.createElement("div");


    card.className =
      "saved-project-item";


    /*
       Project name
    */

    const name =
      document.createElement("strong");


    name.textContent =
      project.projectName ||
      "Công trình chưa đặt tên";


    /*
       Project code
    */

    const code =
      document.createElement("small");


    code.textContent =
      project.projectCode
        ? `Mã: ${project.projectCode}`
        : "Chưa có mã công trình";


    /*
       Project location
    */

    const location =
      document.createElement("small");


    if (project.location) {

      location.textContent =
        `Địa điểm: ${project.location}`;

    } else {

      location.textContent =
        "Địa điểm: Chưa cập nhật";

    }


    /*
       Open button
    */

    const openButton =
      document.createElement("button");


    openButton.type =
      "button";


    openButton.className =
      "primary-btn";


    openButton.textContent =
      "Mở công trình";


    openButton.addEventListener(
      "click",
      () => {

        openSavedProject(
          project.projectId
        );

      }
    );


    /*
       Append
    */

    card.appendChild(
      name
    );


    card.appendChild(
      code
    );


    card.appendChild(
      location
    );


    card.appendChild(
      openButton
    );


    items.appendChild(
      card
    );

  });

}


/* ==========================================================
   PROJECT HOME
========================================================== */

function openProjectHome() {

  updateProjectHome();

  show(
    "screenProjectHome"
  );

}


/* ==========================================================
   PROJECT INFORMATION
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

}


/* ==========================================================
   PROJECT FORM RESET
========================================================== */

function resetProjectForm() {

  const fields = [

    "projectName",

    "projectCode",

    "projectLocation",

    "organization"

  ];


  fields.forEach(id => {

    const field =
      $(id);


    if (field) {

      field.value = "";

    }

  });

}


/* ==========================================================
   NEW PROJECT
========================================================== */

function openNewProject() {

  currentProject =
    null;


  resetProjectForm();


  show(
    "screenProject"
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
      ? $("projectName").value.trim()
      : "";


  const code =
    $("projectCode")
      ? $("projectCode").value.trim()
      : "";


  const location =
    $("projectLocation")
      ? $("projectLocation").value.trim()
      : "";


  const organization =
    $("organization")
      ? $("organization").value.trim()
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
          location,

        organization:
          organization,

        surveyMode:
          null,

        status:
          ProjectStatus.IN_PROGRESS,

        completed:
          false,

        isSaved:
          false,

        updatedAt:
          new Date().toISOString()

      });


    /*
       Explicit lifecycle state.
    */

    currentProject.status =
      ProjectStatus.IN_PROGRESS;


    currentProject.completed =
      false;


    currentProject.isSaved =
      false;


    currentProject.updatedAt =
      new Date().toISOString();


    if (
      DB.updateProject
    ) {

      await DB.updateProject(
        currentProject
      );

    }


    /*
       Refresh project collection.
    */

    await loadProjectState();


    /*
       Current project becomes the draft.
    */

    draftProject =
      currentProject;


    updateHome();


    show(
      "screenSurveyHome"
    );


  } catch (error) {

    console.error(

      "TGS Project Create Error:",

      error

    );


    alert(
      "Không thể tạo hồ sơ công trình."
    );

  }

}


/* ==========================================================
   RESUME DRAFT PROJECT
========================================================== */

function resumeDraftProject() {

  if (!draftProject) {

    alert(
      "Không tìm thấy công trình đang thực hiện."
    );


    return;

  }


  currentProject =
    draftProject;


  updateHome();


  show(
    "screenSurveyHome"
  );

}


/* ==========================================================
   OPEN SAVED PROJECT
========================================================== */

function openSavedProject(
  projectId
) {

  if (
    !projectId
  ) {

    alert(
      "Không xác định được công trình."
    );


    return;

  }


  const project =
    savedProjects.find(
      item =>
        item.projectId ===
        projectId
    );


  if (!project) {

    alert(
      "Không tìm thấy công trình đã lưu."
    );


    return;

  }


  currentProject =
    project;


  updateHome();


  /*
     Close saved project panel.
  */

  closeSavedProjectPanel();


  /*
     Open project survey home.
  */

  show(
    "screenSurveyHome"
  );

}


/* ==========================================================
   SAVED PROJECT PANEL
========================================================== */

function openSavedProjectPanel() {

  const list =
    $("savedProjectList");


  if (!list) {

    return;

  }


  /*
     Always refresh the list before displaying it.
     This ensures a newly saved project appears
     immediately.
  */

  updateSavedProjectHome();


  list.hidden =
    false;

}


function closeSavedProjectPanel() {

  const list =
    $("savedProjectList");


  if (list) {

    list.hidden =
      true;

  }

}


/* ==========================================================
   MAP PROVIDERS
========================================================== */

const MapProviders = {


  /* --------------------------------------------------------
     ARC GIS
  -------------------------------------------------------- */

  arcgis: {

    id: "arcgis",

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


  /* --------------------------------------------------------
     GOOGLE
  -------------------------------------------------------- */

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
   TGS GIS LAYER REGISTRY
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
   GIS LAB DEMO DATA
========================================================== */

const GISLabData = {


  pipe: [

    [10.762250, 106.659800],

    [10.762420, 106.660000],

    [10.762622, 106.660172],

    [10.762850, 106.660350],

    [10.763080, 106.660550]

  ],


  valve: [

    [10.762622, 106.660172],

    [10.762850, 106.660350]

  ],


  tee: [

    [10.762850, 106.660350]

  ],


  elbow: [

    [10.763080, 106.660550]

  ],


  waterStation: [

    [10.763350, 106.660800]

  ],


  customerMeter: [

    [10.762200, 106.660600],

    [10.762350, 106.660750],

    [10.762500, 106.660900]

  ]

};


/* ==========================================================
   GIS LAB LAYER BUILDER
========================================================== */

const GISLabLayerBuilder = {


  createPipeLayer() {

    return L.polyline(

      GISLabData.pipe,

      {

        weight:
          6,

        opacity:
          0.9

      }

    ).bindPopup(

      "<strong>TGS GIS LAB</strong><br>Ống"

    );

  },


  createValveLayer() {

    const group =
      L.layerGroup();


    GISLabData.valve.forEach(
      (coordinate, index) => {

        L.circleMarker(

          coordinate,

          {

            radius:
              8,

            weight:
              3,

            fillOpacity:
              0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Van V" +
            String(index + 1)
              .padStart(3, "0")

          )

          .addTo(
            group
          );

      }
    );


    return group;

  },


  createTeeLayer() {

    const group =
      L.layerGroup();


    GISLabData.tee.forEach(
      (coordinate, index) => {

        L.circleMarker(

          coordinate,

          {

            radius:
              10,

            weight:
              3,

            fillOpacity:
              0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Tê T" +
            String(index + 1)
              .padStart(3, "0")

          )

          .addTo(
            group
          );

      }
    );


    return group;

  },


  createElbowLayer() {

    const group =
      L.layerGroup();


    GISLabData.elbow.forEach(
      (coordinate, index) => {

        L.circleMarker(

          coordinate,

          {

            radius:
              9,

            weight:
              3,

            fillOpacity:
              0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Cút C" +
            String(index + 1)
              .padStart(3, "0")

          )

          .addTo(
            group
          );

      }
    );


    return group;

  },


  createWaterStationLayer() {

    const group =
      L.layerGroup();


    GISLabData.waterStation.forEach(
      (coordinate, index) => {

        L.circleMarker(

          coordinate,

          {

            radius:
              13,

            weight:
              3,

            fillOpacity:
              0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Trạm cấp nước TS" +
            String(index + 1)
              .padStart(3, "0")

          )

          .addTo(
            group
          );

      }
    );


    return group;

  },


  createCustomerMeterLayer() {

    const group =
      L.layerGroup();


    GISLabData.customerMeter.forEach(
      (coordinate, index) => {

        L.circleMarker(

          coordinate,

          {

            radius:
              6,

            weight:
              2,

            fillOpacity:
              0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Đồng hồ KH KH" +
            String(index + 1)
              .padStart(3, "0")

          )

          .addTo(
            group
          );

      }
    );


    return group;

  }

};


/* ==========================================================
   MAP ENGINE
========================================================== */

const MapEngine = {

  map:
    null,

  marker:
    null,

  baseLayer:
    null,

  activeProvider:
    "arcgis",

  defaultLocation: [

    10.762622,

    106.660172

  ],


  initialize() {

    if (this.map) {

      setTimeout(() => {

        this.map.invalidateSize();

      }, 50);


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


    this.setBaseMap(
      "arcgis"
    );


    this.marker =
      L.marker(

        this.defaultLocation

      ).addTo(

        this.map

      );


    GISLayerRegistry
      .surveyPoint
      .layer =
      this.marker;


    this.marker.bindPopup(
      "D001 - Điểm đầu tuyến"
    );


    this.marker.openPopup();


    this.createGISLabLayers();


    this.applyAllGISLayerVisibility();


    console.log(

      "TGS GIS initialized:",

      {

        engine:
          "Leaflet",

        provider:
          this.activeProvider,

        layers:
          Object.keys(
            GISLayerRegistry
          )

      }

    );

  },


  createGISLabLayers() {

    GISLayerRegistry
      .pipe
      .layer =
      GISLabLayerBuilder
        .createPipeLayer();


    GISLayerRegistry
      .valve
      .layer =
      GISLabLayerBuilder
        .createValveLayer();


    GISLayerRegistry
      .tee
      .layer =
      GISLabLayerBuilder
        .createTeeLayer();


    GISLayerRegistry
      .elbow
      .layer =
      GISLabLayerBuilder
        .createElbowLayer();


    GISLayerRegistry
      .waterStation
      .layer =
      GISLabLayerBuilder
        .createWaterStationLayer();


    GISLayerRegistry
      .customerMeter
      .layer =
      GISLabLayerBuilder
        .createCustomerMeterLayer();

  },


  applyAllGISLayerVisibility() {

    Object.keys(
      GISLayerRegistry
    ).forEach(layerId => {

      const registry =
        GISLayerRegistry[layerId];


      if (!registry.layer) {

        return;

      }


      if (registry.visible) {

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

    });

  },


  setBaseMap(providerId) {

    if (!this.map) {

      console.warn(
        "TGS GIS: Map has not been initialized."
      );


      return false;

    }


    const provider =
      MapProviders[providerId];


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


  getActiveProvider() {

    return this.activeProvider;

  },


  zoomIn() {

    if (this.map) {

      this.map.zoomIn();

    }

  },


  zoomOut() {

    if (this.map) {

      this.map.zoomOut();

    }

  },


  locate() {

    if (!this.map) {

      return;

    }


    this.map.flyTo(

      this.defaultLocation,

      19,

      {

        duration:
          1

      }

    );

  },


  addGISLayer(
    layerId,
    leafletLayer
  ) {

    const registry =
      GISLayerRegistry[layerId];


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


  showGISLayer(layerId) {

    const registry =
      GISLayerRegistry[layerId];


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


  hideGISLayer(layerId) {

    const registry =
      GISLayerRegistry[layerId];


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


  toggleGISLayer(layerId) {

    const registry =
      GISLayerRegistry[layerId];


    if (!registry) {

      console.error(
        "TGS GIS: Unknown GIS layer:",
        layerId
      );


      return false;

    }


    if (registry.visible) {

      return this.hideGISLayer(
        layerId
      );

    }


    return this.showGISLayer(
      layerId
    );

  }

};


/* ==========================================================
   MAP LAYER CONTROL
========================================================== */

const MapLayerControl = {


  bindBaseMapControls() {

    const controls =
      document.querySelectorAll(
        'input[name="baseMap"]'
      );


    controls.forEach(control => {

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

    });

  },


  bindGISLayerControls() {

    const controls =
      document.querySelectorAll(
        "[data-layer] input[type='checkbox']"
      );


    controls.forEach(control => {

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

            GISLayerRegistry[layerId]
              ? GISLayerRegistry[layerId].visible
              : null

          );

        }
      );

    });

  },


  syncUI() {

    Object.keys(
      GISLayerRegistry
    ).forEach(layerId => {

      const registry =
        GISLayerRegistry[layerId];


      const option =
        document.querySelector(
          `[data-layer="${layerId}"] input[type="checkbox"]`
        );


      if (option) {

        option.checked =
          registry.visible;

      }

    });

  },


  initialize() {

    this.bindBaseMapControls();

    this.bindGISLayerControls();

    this.syncUI();

  }

};


/* ==========================================================
   BUTTON EVENT
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

        /*
           Always enter Project Home.

           Never automatically open an existing project.
        */

        openProjectHome();

      };

  }


  /* --------------------------------------------------------
     NEW PROJECT
  -------------------------------------------------------- */

  const btnNewProject =
    $("btnNewProject");


  if (btnNewProject) {

    btnNewProject.onclick =
      openNewProject;

  }


  /* --------------------------------------------------------
     OPEN SAVED PROJECTS
  -------------------------------------------------------- */

  const btnOpenSavedProjects =
    $("btnOpenSavedProjects");


  if (btnOpenSavedProjects) {

    btnOpenSavedProjects.onclick =
      openSavedProjectPanel;

  }


  /* --------------------------------------------------------
     CLOSE SAVED PROJECTS
  -------------------------------------------------------- */

  const btnCloseSavedProjects =
    $("btnCloseSavedProjects");


  if (btnCloseSavedProjects) {

    btnCloseSavedProjects.onclick =
      closeSavedProjectPanel;

  }


  /* --------------------------------------------------------
     RESUME DRAFT
  -------------------------------------------------------- */

  const btnResumeProject =
    $("btnResumeProject");


  if (btnResumeProject) {

    btnResumeProject.onclick =
      resumeDraftProject;

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
     PROJECT HOME BACK
  -------------------------------------------------------- */

  const btnBackProjectHome =
    $("btnBackProjectHome");


  if (btnBackProjectHome) {

    btnBackProjectHome.onclick =
      openProjectHome;

  }


  /* --------------------------------------------------------
     POINT / LINEAR BACK
  -------------------------------------------------------- */

  document
    .querySelectorAll(
      "#screenPoint .back-btn, #screenLinear .back-btn"
    )
    .forEach(btn => {

      btn.onclick =
        () => {

          show(
            "screenSurveyHome"
          );

        };

    });


  /* --------------------------------------------------------
     MAP ZOOM
  -------------------------------------------------------- */

  const btnZoomIn =
    $("btnZoomIn");


  if (btnZoomIn) {

    btnZoomIn.onclick =
      () => {

        MapEngine.zoomIn();

      };

  }


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

        MapEngine.locate();

      };

  }


  /* --------------------------------------------------------
     FIRST GPS
  -------------------------------------------------------- */

  const btnFirstGPS =
    $("btnFirstGPS");


  if (btnFirstGPS) {

    btnFirstGPS.onclick =
      () => {

        alert(
          "REV06 sẽ lấy GPS thật của thiết bị."
        );

      };

  }

}


/* ==========================================================
   LOAD PROJECT STATE
========================================================== */

async function loadProjectState() {

  /*
     REV06:
     Read ALL projects instead of only the latest project.
  */

  allProjects =
    await DB.getAllProjects();


  /*
     Sort newest first.
  */

  allProjects.sort(
    (a, b) => {

      return (
        getProjectTime(b) -
        getProjectTime(a)
      );

    }
  );


  /*
     Reset state.
  */

  draftProject =
    null;


  savedProjects = [];


  /*
     Find unfinished project.

     If multiple unfinished projects exist,
     use the most recently updated one
     for the primary Resume action.
  */

  for (
    const project of allProjects
  ) {

    if (
      isDraftProject(project)
    ) {

      if (
        !draftProject
      ) {

        draftProject =
          project;

      }

    }

  }


  /*
     Build saved project collection.

     Legacy projects without status are included.
  */

  allProjects.forEach(
    project => {

      if (
        isSavedProject(project)
      ) {

        savedProjects.push(
          project
        );

      }

    }
  );


  /*
     Newest first.
  */

  savedProjects.sort(
    (a, b) => {

      return (
        getProjectTime(b) -
        getProjectTime(a)
      );

    }
  );


  updateProjectHome();


  console.log(

    "TGS Project Lifecycle:",

    {

      totalProjects:
        allProjects.length,

      draftProject:
        draftProject
          ? draftProject.projectName
          : null,

      savedProjects:
        savedProjects.map(
          project =>
            project.projectName
        )

    }

  );

}


/* ==========================================================
   BOOT
========================================================== */

window.addEventListener(

  "load",

  async () => {


    /* ------------------------------------------------------
       SPLASH
    ------------------------------------------------------ */

    show(
      "screenSplash"
    );


    /* ------------------------------------------------------
       BUTTONS
    ------------------------------------------------------ */

    bindButtons();


    /* ------------------------------------------------------
       MAP LAYER CONTROL
    ------------------------------------------------------ */

    MapLayerControl.initialize();


    /* ------------------------------------------------------
       DATABASE
    ------------------------------------------------------ */

    try {

      await DB.initDatabase();


      dbReady =
        true;


      /*
         Load complete project collection.
      */

      await loadProjectState();


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
