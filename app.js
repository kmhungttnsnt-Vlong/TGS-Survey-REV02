/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV07

   PROJECT LIFECYCLE + GIS LAB

   REV07 CHANGE
   ----------------------------------------------------------
   1. Project lifecycle is now fully implemented.
   2. IN_PROGRESS -> COMPLETED -> SAVED.
   3. COMPLETED but not SAVED remains an unfinished project.
   4. Added "Hoàn thành khảo sát" workflow.
   5. Added "Lưu công trình" workflow.
   6. Added completion screen handling.
   7. Existing saved projects remain readable.
   8. Legacy projects without lifecycle fields remain SAVED.
   9. Existing ArcGIS / GIS Lab / D001 behavior preserved.
  10. No database reset.
  11. No project deletion.

   PROJECT LIFECYCLE

      CREATE
        ↓
      IN_PROGRESS
        ↓
      HOÀN THÀNH KHẢO SÁT
        ↓
      COMPLETED / NOT SAVED
        ↓
      LƯU CÔNG TRÌNH
        ↓
      SAVED
        ↓
      MỞ LẠI CÔNG TRÌNH ĐÃ LƯU

   IMPORTANT

   - "COMPLETED" does NOT mean saved.
   - Only "SAVED" is displayed in saved-project list.
   - A COMPLETED but unsaved project remains resumable.
   - Legacy projects without status are treated as saved.
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

  "screenProjectComplete",

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

/*
   A project is considered unfinished when:

   - DRAFT
   - IN_PROGRESS
   - COMPLETED but not yet saved
   - isSaved === false

   This is important because:

   COMPLETED != SAVED
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
     Completed but not saved.
  */

  if (
    status === ProjectStatus.COMPLETED &&
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
    project.completed === false
  ) {

    return true;

  }


  return false;

}


/*
   Only SAVED projects belong to:

   "Mở lại công trình đã lưu"

   Legacy projects without lifecycle fields are
   still considered saved for backward compatibility.
*/

function isSavedProject(project) {

  if (!project) {

    return false;

  }


  /*
     Never put unfinished projects in saved list.
  */

  if (
    isDraftProject(project)
  ) {

    return false;

  }


  /*
     Explicit SAVED state.
  */

  if (
    project.status ===
    ProjectStatus.SAVED
  ) {

    return true;

  }


  /*
     Explicit saved flag.
  */

  if (
    project.isSaved === true
  ) {

    return true;

  }


  /*
     Legacy project.

     Old projects may not contain:

     - status
     - isSaved
     - completed

     They are preserved as saved projects.
  */

  const hasLifecycleField =
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
    !hasLifecycleField
  ) {

    return true;

  }


  return false;

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
    new Date(
      value || 0
    ).getTime();


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

    notice.hidden =
      false;


    if (resumeButton) {

      resumeButton.hidden =
        false;

    }

  } else if (notice) {

    notice.hidden =
      true;

  }


  updateSavedProjectHome();

}


/* ==========================================================
   RENDER SAVED PROJECTS
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
      document.createElement(
        "div"
      );


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

  savedProjects.forEach(
    project => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "saved-project-item";


      /*
         Project name
      */

      const name =
        document.createElement(
          "strong"
        );


      name.textContent =
        project.projectName ||
        "Công trình chưa đặt tên";


      /*
         Project code
      */

      const code =
        document.createElement(
          "small"
        );


      code.textContent =
        project.projectCode
          ? `Mã: ${project.projectCode}`
          : "Chưa có mã công trình";


      /*
         Project location
      */

      const location =
        document.createElement(
          "small"
        );


      location.textContent =
        project.location
          ? `Địa điểm: ${project.location}`
          : "Địa điểm: Chưa cập nhật";


      /*
         Open button
      */

      const openButton =
        document.createElement(
          "button"
        );


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

    }
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


  updateCompletionUI();

}


/* ==========================================================
   COMPLETION UI
========================================================== */

function updateCompletionUI() {

  const card =
    $("projectCompletionCard");


  if (!card) {

    return;

  }


  /*
     Saved project:

     The project has already been stored as completed.
     Do not present "Hoàn thành khảo sát" again.
  */

  if (
    currentProject &&
    currentProject.status ===
    ProjectStatus.SAVED
  ) {

    card.hidden =
      true;

    return;

  }


  /*
     New / in-progress / completed-but-unsaved

     Keep completion action available.
  */

  card.hidden =
    false;

}


/* ==========================================================
   RESET PROJECT FORM
========================================================== */

function resetProjectForm() {

  const fields = [

    "projectName",

    "projectCode",

    "projectLocation",

    "organization"

  ];


  fields.forEach(
    id => {

      const field =
        $(id);


      if (field) {

        field.value =
          "";

      }

    }
  );

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


    await loadProjectState();


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

  if (!projectId) {

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


  closeSavedProjectPanel();


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
   COMPLETE PROJECT
========================================================== */

async function completeProject() {

  if (!currentProject) {

    alert(
      "Chưa có công trình đang thực hiện."
    );


    return;

  }


  /*
     If already saved, there is nothing to complete.
  */

  if (
    currentProject.status ===
    ProjectStatus.SAVED
  ) {

    alert(
      "Công trình này đã được lưu."
    );


    return;

  }


  const confirmed =
    window.confirm(

      "Xác nhận đã hoàn thành khảo sát công trình?\n\n" +
      "Sau bước này hồ sơ sẽ chuyển sang trạng thái " +
      "\"Đã hoàn thành\" và chờ bạn bấm \"Lưu công trình\"."

    );


  if (!confirmed) {

    return;

  }


  try {

    /*
       IMPORTANT:

       COMPLETED is NOT SAVED.

       The project remains resumable until the
       user explicitly presses "Lưu công trình".
    */

    currentProject.status =
      ProjectStatus.COMPLETED;


    currentProject.completed =
      true;


    currentProject.isSaved =
      false;


    currentProject.completedAt =
      new Date().toISOString();


    currentProject.updatedAt =
      new Date().toISOString();


    await DB.updateProject(
      currentProject
    );


    /*
       Refresh all project state.

       Because isSaved === false,
       this project remains in draftProject.
    */

    await loadProjectState();


    /*
       Keep current project reference after refresh.
    */

    const refreshedProject =
      allProjects.find(
        project =>
          project.projectId ===
          currentProject.projectId
      );


    if (refreshedProject) {

      currentProject =
        refreshedProject;

    }


    /*
       Update completion screen.
    */

    updateCompletionScreen();


    show(
      "screenProjectComplete"
    );


    console.log(
      "TGS Project Status:",
      "COMPLETED / NOT SAVED"
    );


  } catch (error) {

    console.error(

      "TGS Complete Project Error:",

      error

    );


    alert(
      "Không thể hoàn thành hồ sơ công trình."
    );

  }

}


/* ==========================================================
   COMPLETION SCREEN
========================================================== */

function updateCompletionScreen() {

  if (!currentProject) {

    return;

  }


  const title =
    $("completeProjectTitle");


  const name =
    $("completeProjectName");


  const code =
    $("completeProjectCode");


  if (title) {

    title.textContent =
      currentProject.projectName ||
      "Công trình";

  }


  if (name) {

    name.textContent =
      currentProject.projectName ||
      "--";

  }


  if (code) {

    code.textContent =
      currentProject.projectCode ||
      "--";

  }

}


/* ==========================================================
   BACK FROM COMPLETION
========================================================== */

function backToSurveyFromCompletion() {

  if (!currentProject) {

    openProjectHome();

    return;

  }


  /*
     Do NOT change status.

     If the project is COMPLETED but not saved,
     it remains COMPLETED / NOT SAVED.
  */

  updateHome();


  show(
    "screenSurveyHome"
  );

}


/* ==========================================================
   SAVE PROJECT
========================================================== */

async function saveProject() {

  if (!currentProject) {

    alert(
      "Không có công trình để lưu."
    );


    return;

  }


  /*
     Only a completed project can be saved.
  */

  if (
    currentProject.status !==
      ProjectStatus.COMPLETED &&
    currentProject.completed !== true
  ) {

    alert(
      "Hãy hoàn thành khảo sát trước khi lưu công trình."
    );


    return;

  }


  const confirmed =
    window.confirm(

      "Lưu công trình này vào hồ sơ đã hoàn thành?"

    );


  if (!confirmed) {

    return;

  }


  try {

    /*
       Final lifecycle transition.
    */

    currentProject.status =
      ProjectStatus.SAVED;


    currentProject.completed =
      true;


    currentProject.isSaved =
      true;


    currentProject.savedAt =
      new Date().toISOString();


    currentProject.updatedAt =
      new Date().toISOString();


    await DB.updateProject(
      currentProject
    );


    /*
       Reload complete project state.

       This removes the project from draftProject
       and places it into savedProjects.
    */

    await loadProjectState();


    /*
       Refresh current reference.
    */

    const savedReference =
      allProjects.find(
        project =>
          project.projectId ===
          currentProject.projectId
      );


    if (savedReference) {

      currentProject =
        savedReference;

    }


    /*
       Return to project home.
    */

    openProjectHome();


    console.log(
      "TGS Project Status:",
      "SAVED"
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
    ).forEach(
      layerId => {

        const registry =
          GISLayerRegistry[layerId];


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


  setBaseMap(providerId) {

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


  showGISLayer(layerId) {

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


  hideGISLayer(layerId) {

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


  toggleGISLayer(layerId) {

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


    controls.forEach(
      control => {

        control.addEventListener(
          "change",
          () => {

            const providerId =
              control.value;


            if (
              providerId ===
              "arcgis"
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
     BACK TO SURVEY
  -------------------------------------------------------- */

  const btnBackToSurvey =
    $("btnBackToSurvey");


  if (btnBackToSurvey) {

    btnBackToSurvey.onclick =
      backToSurveyFromCompletion;

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
          "REV07 sẽ lấy GPS thật của thiết bị."
        );

      };

  }

}


/* ==========================================================
   LOAD PROJECT STATE
========================================================== */

async function loadProjectState() {

  /*
     Read ALL projects.
  */

  allProjects =
    await DB.getAllProjects();


  /*
     Newest first.
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
     Reset lifecycle collections.
  */

  draftProject =
    null;


  savedProjects =
    [];


  /*
     Find the most recently updated unfinished project.

     This includes:

     - DRAFT
     - IN_PROGRESS
     - COMPLETED but not saved
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
     Build saved collection.

     IMPORTANT:
     COMPLETED / isSaved=false does NOT
     enter this list.
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
     Newest saved projects first.
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
          ? {

              name:
                draftProject.projectName,

              status:
                draftProject.status,

              isSaved:
                draftProject.isSaved

            }
          : null,

      savedProjects:
        savedProjects.map(
          project => ({

            name:
              project.projectName,

            status:
              project.status

          })
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
         Load complete project state.
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
