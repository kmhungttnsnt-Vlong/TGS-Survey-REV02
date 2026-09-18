/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV04

   GIS LAB - LAYER CONTROL

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

   REV04 PURPOSE:

   1. Connect Base Map control.
   2. Connect TGS GIS Layer control.
   3. Create temporary GIS LAB demo objects.
   4. Verify independent layer visibility.
   5. Preserve existing Survey / Project behavior.

   IMPORTANT:

   - Demo GIS objects are TEST DATA ONLY.
   - They are not real project GIS data.
   - Google provider is intentionally not activated.
   - GPS / VN2000 are not modified in this revision.
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
  --------------------------------------------------------

     Prepared only.

     Google Maps will be integrated through an official
     Google Maps Platform mechanism in a later sprint.

     Direct Google tile URLs are intentionally NOT used.

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


  /* --------------------------------------------------------
     SURVEY POINT
  -------------------------------------------------------- */

  surveyPoint: {

    id: "surveyPoint",

    name: "Điểm khảo sát",

    category: "survey",

    visible: true,

    layer: null

  },


  /* --------------------------------------------------------
     SURVEY ROUTE
  -------------------------------------------------------- */

  surveyRoute: {

    id: "surveyRoute",

    name: "Tuyến khảo sát",

    category: "survey",

    visible: true,

    layer: null

  },


  /* --------------------------------------------------------
     PIPE
  -------------------------------------------------------- */

  pipe: {

    id: "pipe",

    name: "Ống",

    category: "network",

    visible: false,

    layer: null

  },


  /* --------------------------------------------------------
     VALVE
  -------------------------------------------------------- */

  valve: {

    id: "valve",

    name: "Van",

    category: "network",

    visible: false,

    layer: null

  },


  /* --------------------------------------------------------
     TEE
  -------------------------------------------------------- */

  tee: {

    id: "tee",

    name: "Tê",

    category: "network",

    visible: false,

    layer: null

  },


  /* --------------------------------------------------------
     ELBOW
  -------------------------------------------------------- */

  elbow: {

    id: "elbow",

    name: "Cút",

    category: "network",

    visible: false,

    layer: null

  },


  /* --------------------------------------------------------
     WATER STATION
  -------------------------------------------------------- */

  waterStation: {

    id: "waterStation",

    name: "Trạm cấp nước",

    category: "facility",

    visible: false,

    layer: null

  },


  /* --------------------------------------------------------
     CUSTOMER METER
  -------------------------------------------------------- */

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
==========================================================

   IMPORTANT:

   These coordinates are synthetic test geometry around
   the existing D001 location.

   They exist only to prove:

   - layer visibility
   - layer independence
   - map interaction
   - future GIS architecture

   They are NOT real infrastructure data.

========================================================== */

const GISLabData = {


  /* --------------------------------------------------------
     PIPE
  -------------------------------------------------------- */

  pipe: [

    [10.762250, 106.659800],

    [10.762420, 106.660000],

    [10.762622, 106.660172],

    [10.762850, 106.660350],

    [10.763080, 106.660550]

  ],


  /* --------------------------------------------------------
     VALVE
  -------------------------------------------------------- */

  valve: [

    [10.762622, 106.660172],

    [10.762850, 106.660350]

  ],


  /* --------------------------------------------------------
     TEE
  -------------------------------------------------------- */

  tee: [

    [10.762850, 106.660350]

  ],


  /* --------------------------------------------------------
     ELBOW
  -------------------------------------------------------- */

  elbow: [

    [10.763080, 106.660550]

  ],


  /* --------------------------------------------------------
     WATER STATION
  -------------------------------------------------------- */

  waterStation: [

    [10.763350, 106.660800]

  ],


  /* --------------------------------------------------------
     CUSTOMER METER
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     PIPE
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     VALVE
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     TEE
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     ELBOW
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     WATER STATION
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     CUSTOMER METER
  -------------------------------------------------------- */

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


    const mapElement =
      $("map");


    if (!mapElement) {

      console.error(

        "TGS GIS: #map element was not found."

      );


      return;

    }


    /* ------------------------------------------------------
       CREATE MAP
    ------------------------------------------------------ */

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


    /* ------------------------------------------------------
       DEFAULT BASE MAP
    ------------------------------------------------------ */

    this.setBaseMap("arcgis");


    /* ------------------------------------------------------
       SURVEY POINT D001
    ------------------------------------------------------ */

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


    /* ------------------------------------------------------
       CREATE GIS LAB LAYERS
    ------------------------------------------------------ */

    this.createGISLabLayers();


    /* ------------------------------------------------------
       APPLY INITIAL VISIBILITY
    ------------------------------------------------------ */

    this.applyAllGISLayerVisibility();


    console.log(

      "TGS GIS initialized:",

      {

        engine: "Leaflet",

        provider:
          this.activeProvider,

        layers:
          Object.keys(
            GISLayerRegistry
          )

      }

    );

  },


  /* --------------------------------------------------------
     CREATE GIS LAB LAYERS
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     APPLY ALL GIS LAYER VISIBILITY
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     SET BASE MAP
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
       TILE PROVIDER
    ------------------------------------------------------ */

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


  /* --------------------------------------------------------
     GET ACTIVE PROVIDER
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
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     SHOW GIS LAYER
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     HIDE GIS LAYER
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     TOGGLE GIS LAYER
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     BASE MAP CONTROL
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     GIS LAYER CONTROL
  -------------------------------------------------------- */

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


  /* --------------------------------------------------------
     SYNC UI WITH REGISTRY
  -------------------------------------------------------- */

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

    btnStart.onclick =
      () => {

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
     BACK BUTTON
  -------------------------------------------------------- */

  document
    .querySelectorAll(
      ".back-btn"
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
