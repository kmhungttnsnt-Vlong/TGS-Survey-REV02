/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV03

   GIS LAB FOUNDATION

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

   IMPORTANT:
   - Base map is independent from TGS GIS data.
   - Survey data must survive base-map switching.
   - Google provider is intentionally not activated yet.
========================================================== */


/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentProject = null;
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
   MAP PROVIDERS
==========================================================

   Base Map Provider abstraction.

   The Survey / GIS business logic must NOT depend directly
   on ArcGIS or Google.

========================================================== */

const MapProviders = {

  /* --------------------------------------------------------
     ARC GIS
  -------------------------------------------------------- */

  arcgis: {

    id: "arcgis",

    name: "ArcGIS World Street Map",

    type: "tile",

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
  --------------------------------------------------------

     Prepared provider definition only.

     Google Maps must be integrated through the official
     Google Maps Platform mechanism.

     DO NOT use Google tile URLs directly.

  -------------------------------------------------------- */

  google: {

    id: "google",

    name: "Google Maps",

    type: "google-maps-platform",

    enabled: false,

    status: "PLANNED",

    note:
      "Google Maps integration will be activated through the official Google Maps Platform API. Direct Google tile URLs are intentionally not used."

  }

};


/* ==========================================================
   TGS GIS LAYER REGISTRY
==========================================================

   These are TGS-owned GIS layers.

   They are deliberately independent from the base map.

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


  /* --------------------------------------------------------
     INITIALIZE
  -------------------------------------------------------- */

  initialize() {

    if (this.map) {

      setTimeout(() => {

        this.map.invalidateSize();

      }, 50);

      return;

    }


    const mapElement = $("map");

    if (!mapElement) {

      console.error(
        "TGS GIS: #map element was not found."
      );

      return;

    }


    this.map = L.map("map", {

      zoomControl: false

    }).setView(

      this.defaultLocation,

      18

    );


    /* ------------------------------------------------------
       DEFAULT BASE MAP
       ArcGIS
    ------------------------------------------------------ */

    this.setBaseMap("arcgis");


    /* ------------------------------------------------------
       TGS SURVEY POINT
    ------------------------------------------------------ */

    this.marker = L.marker(

      this.defaultLocation

    ).addTo(this.map);


    GISLayerRegistry.surveyPoint.layer =
      this.marker;


    this.marker.bindPopup(
      "D001 - Điểm đầu tuyến"
    );


    this.marker.openPopup();


    console.log(
      "TGS GIS initialized:",
      {
        engine: "Leaflet",
        provider: this.activeProvider,
        layers: Object.keys(GISLayerRegistry)
      }
    );

  },


  /* --------------------------------------------------------
     SET BASE MAP
  --------------------------------------------------------

     This method is intentionally isolated.

     Later:

       setBaseMap("arcgis")
       setBaseMap("google-road")
       setBaseMap("google-satellite")
       setBaseMap("google-hybrid")
       setBaseMap("google-terrain")

  -------------------------------------------------------- */

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


    /* ------------------------------------------------------
       REMOVE CURRENT BASE MAP
    ------------------------------------------------------ */

    if (this.baseLayer) {

      this.map.removeLayer(
        this.baseLayer
      );

      this.baseLayer = null;

    }


    /* ------------------------------------------------------
       CREATE TILE PROVIDER
    ------------------------------------------------------ */

    if (provider.type === "tile") {

      this.baseLayer = L.tileLayer(

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
      "TGS GIS: Provider type is not implemented:",
      provider.type
    );


    return false;

  },


  /* --------------------------------------------------------
     GET ACTIVE BASE MAP
  -------------------------------------------------------- */

  getActiveProvider() {

    return this.activeProvider;

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
     LOCATE
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     ADD GIS LAYER
  --------------------------------------------------------

     Generic future layer interface.

     Example:

       MapEngine.addGISLayer(
         "pipe",
         someLeafletLayer
       );

  -------------------------------------------------------- */

  addGISLayer(layerId, leafletLayer) {

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


  /* --------------------------------------------------------
     SHOW GIS LAYER
  -------------------------------------------------------- */

  showGISLayer(layerId) {

    const registry =
      GISLayerRegistry[layerId];


    if (!registry) {

      return false;

    }


    registry.visible = true;


    if (
      registry.layer &&
      this.map
    ) {

      registry.layer.addTo(
        this.map
      );

    }


    return true;

  },


  /* --------------------------------------------------------
     HIDE GIS LAYER
  -------------------------------------------------------- */

  hideGISLayer(layerId) {

    const registry =
      GISLayerRegistry[layerId];


    if (!registry) {

      return false;

    }


    registry.visible = false;


    if (
      registry.layer &&
      this.map
    ) {

      this.map.removeLayer(
        registry.layer
      );

    }


    return true;

  },


  /* --------------------------------------------------------
     TOGGLE GIS LAYER
  -------------------------------------------------------- */

  toggleGISLayer(layerId) {

    const registry =
      GISLayerRegistry[layerId];


    if (!registry) {

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
   PROJECT
========================================================== */

function updateHome() {

  if (!currentProject) {

    return;

  }


  const projectTitle =
    $("projectTitle");


  if (projectTitle) {

    projectTitle.textContent =
      currentProject.projectName;

  }


  const linearProject =
    $("linearProject");


  if (linearProject) {

    linearProject.textContent =
      currentProject.projectName;

  }

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
    $("projectName").value.trim();


  const code =
    $("projectCode").value.trim();


  if (
    name === "" ||
    code === ""
  ) {

    alert(
      "Nhập tên và mã công trình."
    );

    return;

  }


  currentProject =
    await DB.createProject({

      projectName:
        name,

      projectCode:
        code,

      location:
        $("projectLocation").value.trim(),

      organization:
        $("organization").value.trim()

    });


  updateHome();


  show(
    "screenSurveyHome"
  );

}


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

    btnStart.onclick = () => {

      if (currentProject) {

        updateHome();

        show(
          "screenSurveyHome"
        );

      } else {

        show(
          "screenProject"
        );

      }

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
      () => show("screenPoint");

  }


  /* --------------------------------------------------------
     LINEAR SURVEY
  -------------------------------------------------------- */

  const btnLinear =
    $("btnLinear");


  if (btnLinear) {

    btnLinear.onclick =
      () => show("screenLinear");

  }


  /* --------------------------------------------------------
     BACK BUTTON
  -------------------------------------------------------- */

  document
    .querySelectorAll(".back-btn")
    .forEach(btn => {

      btn.onclick = () =>
        show("screenSurveyHome");

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

    btnFirstGPS.onclick = () => {

      alert(
        "REV05 sẽ lấy GPS thật của thiết bị."
      );

    };

  }

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
       OFFLINE DATABASE
    ------------------------------------------------------ */

    try {

      await DB.initDatabase();

      dbReady = true;


      currentProject =
        await DB.getLatestProject();


      if (currentProject) {

        updateHome();

      }


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
