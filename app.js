/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV05

   PROJECT LIFECYCLE + GIS LAB

   Architecture:

   TGS GIS
      │
      ├── Map Engine
      │      └── Leaflet
      │
      ├── Base Map Provider
      │      ├── ArcGIS  ← ACTIVE / DEFAULT
      │      └── Google  ← PREPARED
      │
      └── TGS GIS Layers
             ├── Survey Point
             ├── Survey Route
             ├── Pipe
             ├── Valve
             ├── Tee
             ├── Elbow
             ├── Water Station
             └── Customer Meter

   PROJECT LIFECYCLE:

      APP OPEN
         │
         └── Hồ sơ công trình
                │
                ├── Tạo công trình mới
                │
                ├── Mở lại công trình đã lưu
                │
                └── Công trình đang dở
                       └── Tiếp tục công trình

   REV05 PURPOSE:

   1. Connect new Project Home screen.
   2. Stop auto-opening the latest project.
   3. Detect unfinished / unsaved project.
   4. Allow resume unfinished project.
   5. Allow opening latest saved project.
   6. Create new project as IN_PROGRESS.
   7. Preserve existing GIS / Map behavior.
   8. Preserve ArcGIS as default provider.
   9. Preserve D001 and GIS LAB layers.

   IMPORTANT:

   - GIS LAB demo objects are TEST DATA ONLY.
   - They are not real project GIS data.
   - Google provider is intentionally not activated.
   - GPS / VN2000 are not modified.
========================================================== */


/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentProject = null;

let latestProject = null;

let draftProject = null;

let savedProject = null;

let dbReady = false;

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

  "screenProjectHome",

  "screenProject",

  "screenSurveyHome",

  "screenPoint",

  "screenLinear"

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

/*
   Legacy project compatibility:

   Các project được tạo bởi REV03 trước đây chưa có
   trường status.

   Không được coi chúng là project lỗi.

   Project legacy được xem là hồ sơ đã lưu cho đến khi
   có cơ chế trạng thái mới ghi rõ.
*/

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


  /*
     Một số phiên bản tương lai có thể dùng:
     isSaved / completed
  */

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


function isSavedProject(project) {

  if (!project) {

    return false;

  }


  if (isDraftProject(project)) {

    return false;

  }


  /*
     Legacy project không có status:
     giữ lại và xem như saved để không mất hồ sơ cũ.
  */

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


  return true;

}


/* ==========================================================
   PROJECT HOME STATE
========================================================== */

function updateProjectHome() {

  const notice =
    $("projectDraftNotice");


  const resumeButton =
    $("btnResumeProject");


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


  updateSavedProjectHome();

}


/* ==========================================================
   SAVED PROJECT HOME
========================================================== */

function updateSavedProjectHome() {

  const list =
    $("savedProjectList");


  const items =
    $("savedProjectItems");


  if (!list || !items) {

    return;

  }


  items.innerHTML = "";


  if (!savedProject) {

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


  const card =
    document.createElement("div");


  card.className =
    "saved-project-item";


  const name =
    document.createElement("strong");


  name.textContent =
    savedProject.projectName ||
    "Công trình chưa đặt tên";


  const code =
    document.createElement("small");


  code.textContent =
    savedProject.projectCode
      ? `Mã: ${savedProject.projectCode}`
      : "Chưa có mã công trình";


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

      openSavedProject();

    }
  );


  card.appendChild(
    name
  );


  card.appendChild(
    code
  );


  card.appendChild(
    openButton
  );


  items.appendChild(
    card
  );

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
       DB REV01 currently creates the project object
       internally and may not yet copy all optional fields.

       We therefore make the lifecycle state explicit
       immediately after creation.
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


    draftProject =
      currentProject;


    latestProject =
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

function openSavedProject() {

  if (!savedProject) {

    alert(
      "Chưa có công trình đã lưu."
    );


    return;

  }


  currentProject =
    savedProject;


  updateHome();


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

    openSavedProject();

    return;

  }


  if (!savedProject) {

    updateSavedProjectHome();

  }


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

    name: "ArcGIS World Street Map",

    type: "tile",

    enabled: true,

    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",

    options: {

      maxZoom: 22,

      attribution:
        "Tiles © Esri — Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), OpenStreetMap contributors and the GIS User Community"

    }

  },


  /* --------------------------------------------------------
     GOOGLE
  -------------------------------------------------------- */

  google: {

    id: "google",

    name: "Google Maps",

    type: "google-maps-platform",

    enabled: false,

    status: "PLANNED",

    note:
      "Google Maps integration will use the official Google Maps Platform mechanism."

  }

};


/* ==========================================================
   TGS GIS LAYER REGISTRY
========================================================== */

const GISLayerRegistry = {


  surveyPoint: {

    id: "surveyPoint",

    name: "Điểm khảo sát",

    category: "survey",

    visible: true,

    layer: null

  },


  surveyRoute: {

    id: "surveyRoute",

    name: "Tuyến khảo sát",

    category: "survey",

    visible: true,

    layer: null

  },


  pipe: {

    id: "pipe",

    name: "Ống",

    category: "network",

    visible: false,

    layer: null

  },


  valve: {

    id: "valve",

    name: "Van",

    category: "network",

    visible: false,

    layer: null

  },


  tee: {

    id: "tee",

    name: "Tê",

    category: "network",

    visible: false,

    layer: null

  },


  elbow: {

    id: "elbow",

    name: "Cút",

    category: "network",

    visible: false,

    layer: null

  },


  waterStation: {

    id: "waterStation",

    name: "Trạm cấp nước",

    category: "facility",

    visible: false,

    layer: null

  },


  customerMeter: {

    id: "customerMeter",

    name: "Đồng hồ khách hàng",

    category: "customer",

    visible: false,

    layer: null

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

        weight: 6,

        opacity: 0.9

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

            radius: 8,

            weight: 3,

            fillOpacity: 0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Van V" +
            String(index + 1).padStart(3, "0")

          )

          .addTo(group);

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

            radius: 10,

            weight: 3,

            fillOpacity: 0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Tê T" +
            String(index + 1).padStart(3, "0")

          )

          .addTo(group);

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

            radius: 9,

            weight: 3,

            fillOpacity: 0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Cút C" +
            String(index + 1).padStart(3, "0")

          )

          .addTo(group);

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

            radius: 13,

            weight: 3,

            fillOpacity: 0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Trạm cấp nước TS" +
            String(index + 1).padStart(3, "0")

          )

          .addTo(group);

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

            radius: 6,

            weight: 2,

            fillOpacity: 0.9

          }

        )

          .bindPopup(

            "<strong>TGS GIS LAB</strong><br>" +
            "Đồng hồ KH KH" +
            String(index + 1).padStart(3, "0")

          )

          .addTo(group);

      }
    );


    return group;

  }

};


/* ==========================================================
   MAP ENGINE
========================================================== */

const MapEngine = {

  map: null,

  marker: null,

  baseLayer: null,

  activeProvider: "arcgis",

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

          zoomControl: false

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


    if (provider.enabled === false) {

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


    if (provider.type === "tile") {

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

        duration: 1

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
           IMPORTANT:

           Không tự động mở currentProject.

           Người dùng luôn đi qua Project Home để
           lựa chọn:
             - Tạo mới
             - Mở lại
             - Tiếp tục project đang dở
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
      () => show(
        "screenPoint"
      );

  }


  /* --------------------------------------------------------
     LINEAR SURVEY
  -------------------------------------------------------- */

  const btnLinear =
    $("btnLinear");


  if (btnLinear) {

    btnLinear.onclick =
      () => show(
        "screenLinear"
      );

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
     BACK BUTTONS
  --------------------------------------------------------

     Các back button của Survey / Point / Linear
     vẫn quay về Survey Home.

  -------------------------------------------------------- */

  document
    .querySelectorAll(
      "#screenPoint .back-btn, #screenLinear .back-btn"
    )
    .forEach(btn => {

      btn.onclick =
        () => show(
          "screenSurveyHome"
        );

    });


  /* --------------------------------------------------------
     MAP ZOOM
  -------------------------------------------------------- */

  const btnZoomIn =
    $("btnZoomIn");


  if (btnZoomIn) {

    btnZoomIn.onclick =
      () => MapEngine.zoomIn();

  }


  const btnZoomOut =
    $("btnZoomOut");


  if (btnZoomOut) {

    btnZoomOut.onclick =
      () => MapEngine.zoomOut();

  }


  /* --------------------------------------------------------
     MAP LOCATE
  -------------------------------------------------------- */

  const btnLocate =
    $("btnLocate");


  if (btnLocate) {

    btnLocate.onclick =
      () => MapEngine.locate();

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
          "REV05 sẽ lấy GPS thật của thiết bị."
        );

      };

  }

}


/* ==========================================================
   LOAD PROJECT STATE
========================================================== */

async function loadProjectState() {

  latestProject =
    await DB.getLatestProject();


  currentProject =
    null;


  draftProject =
    null;


  savedProject =
    null;


  if (!latestProject) {

    updateProjectHome();

    return;

  }


  if (
    isDraftProject(
      latestProject
    )
  ) {

    draftProject =
      latestProject;

  } else if (
    isSavedProject(
      latestProject
    )
  ) {

    savedProject =
      latestProject;

  }


  updateProjectHome();

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
       OFFLINE DATABASE
    ------------------------------------------------------ */

    try {

      await DB.initDatabase();


      dbReady =
        true;


      await loadProjectState();


      console.log(

        "TGS Project Lifecycle:",

        {

          latestProject:
            latestProject
              ? latestProject.projectName
              : null,

          draftProject:
            draftProject
              ? draftProject.projectName
              : null,

          savedProject:
            savedProject
              ? savedProject.projectName
              : null

        }

      );


    } catch (err) {

      console.error(

        "TGS Offline Database Error:",

        err

      );


      alert(
        "Không thể khởi tạo bộ nhớ Offline."
      );

    }

  }

);
