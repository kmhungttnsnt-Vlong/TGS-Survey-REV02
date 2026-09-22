/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV10

   QA BASELINE REV10
   -----------------------------------------------
   ✓ Startup Home
   ✓ Resume Project
   ✓ Saved Project
   ✓ ArcGIS Default
   ✓ Real GPS
   ✓ GIS Layer Registry
========================================================== */

let currentProject = null;
let dbReady = false;

const $ = (id) => document.getElementById(id);

/* ==========================================================
   PROJECT STATE
========================================================== */

const PROJECT_STATUS = {
  DRAFT: "draft",
  COMPLETED: "completed"
};

/* ==========================================================
   STARTUP STATE
========================================================== */

let startupState = {
  draftProject: null,
  savedProjects: []
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
  "screenLinear",
  "screenProjectComplete"
];

function show(screenId) {

  screens.forEach(id => {
    const el = $(id);
    if (el) el.classList.remove("active");
  });

  const target = $(screenId);

  if (target) target.classList.add("active");

  if (screenId === "screenLinear") {
    setTimeout(() => MapEngine.initialize(), 150);
  }

}

/* ==========================================================
   MAP ENGINE
========================================================== */

const MapEngine = {

  map: null,
  marker: null,

  baseLayers: {},
  activeLayer: null,

  defaultLocation: [10.762622,106.660172],

  initialize(){

    if(this.map){
      this.map.invalidateSize();
      return;
    }

    this.map=L.map("map",{
      zoomControl:false
    }).setView(this.defaultLocation,18);

    /* ArcGIS Street */

    this.baseLayers.arcgis=L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom:22,
        attribution:"Tiles © Esri"
      }
    );

    this.baseLayers.arcgis.addTo(this.map);

    this.activeLayer=this.baseLayers.arcgis;

    this.marker=L.marker(this.defaultLocation).addTo(this.map);

    this.marker.bindPopup("D001 - Điểm đầu tuyến");

    this.marker.openPopup();

  },

  switchBaseMap(name){

    if(!this.map) return;

    if(this.activeLayer){
      this.map.removeLayer(this.activeLayer);
    }

    if(name==="arcgis"){
      this.activeLayer=this.baseLayers.arcgis;
    }

    this.activeLayer.addTo(this.map);

  },

  zoomIn(){

    if(this.map) this.map.zoomIn();

  },

  zoomOut(){

    if(this.map) this.map.zoomOut();

  },

  locate(){

    GPS.readCurrentLocation();

  }

};

/* ==========================================================
   GPS ENGINE (REAL DEVICE)
========================================================== */

const GPS={

  watchId:null,

  readCurrentLocation(){

    if(!navigator.geolocation){

      updateGPSStatus("Thiết bị không hỗ trợ GPS");

      return;

    }

    navigator.geolocation.getCurrentPosition(

      this.success,

      this.error,

      {
        enableHighAccuracy:true,
        timeout:15000,
        maximumAge:0
      }

    );

  },

  success(position){

    const lat=position.coords.latitude;
    const lon=position.coords.longitude;
    const acc=Math.round(position.coords.accuracy);

    updateGPSStatus(
      `Lat ${lat.toFixed(6)} · Lon ${lon.toFixed(6)} · ±${acc} m`
    );

    if($("gpsAccuracy")){
      $("gpsAccuracy").textContent=`± ${acc} m`;
    }

    if($("vnCoord")){
      $("vnCoord").textContent=`${lat.toFixed(4)} / ${lon.toFixed(4)}`;
    }

    if(MapEngine.map){

      const p=[lat,lon];

      MapEngine.map.flyTo(p,19,{duration:1});

      if(MapEngine.marker){
        MapEngine.marker.setLatLng(p);
      }

    }

  },

  error(err){

    updateGPSStatus("GPS chưa kết nối");

    console.warn(err);

  }

};

function updateGPSStatus(text){

  if($("gpsText")){
    $("gpsText").textContent=text;
  }

}

/* ==========================================================
   GIS LAYER REGISTRY
========================================================== */

const GISLayers={

  point:true,
  route:true,
  pipe:true,
  valve:true,
  tee:true,
  elbow:true,
  station:true,
  meter:true

};

/* ==========================================================
   STARTUP HOME
========================================================== */

async function loadProjectState(){

  startupState.draftProject=await DB.getDraftProject();

  startupState.savedProjects=await DB.getSavedProjects();

  renderStartupHome();

}

function renderStartupHome(){

  const draftCard=$("draftProjectCard");

  if(draftCard){

    if(startupState.draftProject){

      draftCard.style.display="block";

      if($("draftProjectName")){
        $("draftProjectName").textContent=
          startupState.draftProject.projectName;
      }

    }else{

      draftCard.style.display="none";

    }

  }

}

function openDraftProject(){

  currentProject=startupState.draftProject;

  updateProjectHome();

  show("screenSurveyHome");

}

async function openSavedProject(id){

  currentProject=await DB.getProjectById(id);

  updateProjectHome();

  show("screenSurveyHome");

}

/* ==========================================================
   PROJECT UI
========================================================== */

function updateProjectHome(){

  if(!currentProject) return;

  if($("projectTitle")){
    $("projectTitle").textContent=currentProject.projectName;
  }

  if($("linearProject")){
    $("linearProject").textContent=currentProject.projectName;
  }

  if($("completeProjectName")){
    $("completeProjectName").textContent=currentProject.projectName;
  }

  if($("completeProjectCode")){
    $("completeProjectCode").textContent=currentProject.projectCode;
  }

}
function resetProjectForm(){

  if($("projectName")) $("projectName").value="";

  if($("projectCode")) $("projectCode").value="";

  if($("projectLocation")) $("projectLocation").value="";

  if($("organization")) $("organization").value="";

}

/* ==========================================================
   CREATE PROJECT
========================================================== */

async function createProject(){

  if(!dbReady){
    alert("Offline Database chưa sẵn sàng.");
    return;
  }

  const name=$("projectName").value.trim();
  const code=$("projectCode").value.trim();

  if(name===""||code===""){
    alert("Vui lòng nhập Tên và Mã công trình.");
    return;
  }

  currentProject=await DB.createProject({

    projectName:name,

    projectCode:code,

    location:$("projectLocation").value.trim(),

    organization:$("organization").value.trim(),

    status:PROJECT_STATUS.DRAFT

  });

  updateProjectHome();

  show("screenSurveyHome");

}

/* ==========================================================
   COMPLETE PROJECT
========================================================== */

function completeProject(){

  if(!currentProject) return;

  updateProjectHome();

  show("screenProjectComplete");

}

/* ==========================================================
   SAVE COMPLETED PROJECT
========================================================== */

async function saveCompletedProject(){

  if(!currentProject) return;

  currentProject.status=PROJECT_STATUS.COMPLETED;

  currentProject.completedAt=new Date().toISOString();

  await DB.updateProject(currentProject);

  startupState.draftProject=null;

  startupState.savedProjects=
    await DB.getSavedProjects();

  renderSavedProjects();

  alert("Đã lưu công trình thành công.");

  show("screenProjectHome");

}

/* ==========================================================
   RENDER SAVED PROJECTS
========================================================== */

function renderSavedProjects(){

  const container=$("savedProjectList");

  if(!container) return;

  container.innerHTML="";

  if(startupState.savedProjects.length===0){

    container.innerHTML=`
      <div class="empty-project">
        Chưa có công trình đã lưu
      </div>
    `;

    return;

  }

  startupState.savedProjects.forEach(project=>{

    const card=document.createElement("div");

    card.className="saved-card";

    card.innerHTML=`
      <h4>${project.projectName}</h4>

      <p>Mã: ${project.projectCode}</p>

      <p>${project.location||""}</p>

      <button class="primary-btn open-project"
              data-id="${project.projectId}">
        Mở công trình
      </button>
    `;

    container.appendChild(card);

  });

  container
    .querySelectorAll(".open-project")
    .forEach(btn=>{

      btn.onclick=()=>{

        openSavedProject(btn.dataset.id);

      };

    });

}

/* ==========================================================
   CONTINUE DRAFT
========================================================== */

function continueDraftProject(){

  if(!startupState.draftProject) return;

  currentProject=startupState.draftProject;

  updateProjectHome();

  show("screenSurveyHome");

}

/* ==========================================================
   OPEN SAVED PANEL
========================================================== */

function openSavedProjects(){

  renderSavedProjects();

  const panel=$("savedProjectsPanel");

  if(panel){

    panel.classList.add("active");

  }

}

function closeSavedProjects(){

  const panel=$("savedProjectsPanel");

  if(panel){

    panel.classList.remove("active");

  }

}

/* ==========================================================
   LOAD SAVED PROJECT
========================================================== */

async function openSavedProject(projectId){

  const project=await DB.getProjectById(projectId);

  if(!project) return;

  currentProject=project;

  closeSavedProjects();

  updateProjectHome();

  show("screenSurveyHome");

}
function bindButtons(){

  /* =========================================
     SPLASH
  ========================================= */

  const btnStart=$("btnStart");

  if(btnStart){

    btnStart.onclick=async()=>{

      await loadProjectState();

      renderSavedProjects();

      show("screenProjectHome");

    };

  }

  /* =========================================
     STARTUP HOME
  ========================================= */

  const btnContinueDraft=$("btnContinueDraft");

  if(btnContinueDraft){

    btnContinueDraft.onclick=()=>{

      continueDraftProject();

    };

  }

  const btnNewProject=$("btnNewProject");

  if(btnNewProject){

    btnNewProject.onclick=()=>{

      resetProjectForm();

      show("screenProject");

    };

  }

  const btnOpenSavedProjects=$("btnOpenSavedProjects");

  if(btnOpenSavedProjects){

    btnOpenSavedProjects.onclick=()=>{

      openSavedProjects();

    };

  }

  const btnCloseSaved=$("btnCloseSaved");

  if(btnCloseSaved){

    btnCloseSaved.onclick=()=>{

      closeSavedProjects();

    };

  }

  /* =========================================
     PROJECT FORM
  ========================================= */

  const btnCreateProject=$("btnCreateProject");

  if(btnCreateProject){

    btnCreateProject.onclick=createProject;

  }

  /* =========================================
     SURVEY HOME
  ========================================= */

  const btnPoint=$("btnPoint");

  if(btnPoint){

    btnPoint.onclick=()=>show("screenPoint");

  }

  const btnLinear=$("btnLinear");

  if(btnLinear){

    btnLinear.onclick=()=>show("screenLinear");

  }

  const btnFinishProject=$("btnFinishProject");

  if(btnFinishProject){

    btnFinishProject.onclick=()=>{

      completeProject();

    };

  }

  /* =========================================
     COMPLETE PAGE
  ========================================= */

  const btnSaveProject=$("btnSaveProject");

  if(btnSaveProject){

    btnSaveProject.onclick=async()=>{

      await saveCompletedProject();

    };

  }

  const btnReturnSurvey=$("btnReturnSurvey");

  if(btnReturnSurvey){

    btnReturnSurvey.onclick=()=>{

      show("screenSurveyHome");

    };

  }

  /* =========================================
     BACK BUTTONS
  ========================================= */

  document.querySelectorAll(".back-btn").forEach(btn=>{

    btn.onclick=()=>{

      const target=btn.dataset.back;

      if(target){

        show(target);

      }else{

        show("screenSurveyHome");

      }

    };

  });

  /* =========================================
     MAP
  ========================================= */

  const btnLocate=$("btnLocate");

  if(btnLocate){

    btnLocate.onclick=()=>MapEngine.locate();

  }

  const btnZoomIn=$("btnZoomIn");

  if(btnZoomIn){

    btnZoomIn.onclick=()=>MapEngine.zoomIn();

  }

  const btnZoomOut=$("btnZoomOut");

  if(btnZoomOut){

    btnZoomOut.onclick=()=>MapEngine.zoomOut();

  }

  const btnFirstGPS=$("btnFirstGPS");

  if(btnFirstGPS){

    btnFirstGPS.onclick=()=>{

      GPS.readCurrentLocation();

    };

  }

  /* =========================================
     BASEMAP
  ========================================= */

  const btnBasemap=$("btnBasemap");

  if(btnBasemap){

    btnBasemap.onclick=()=>{

      const panel=$("basemapPanel");

      if(panel){

        panel.classList.toggle("active");

      }

    };

  }

  document.querySelectorAll("[data-basemap]").forEach(item=>{

    item.onclick=()=>{

      const type=item.dataset.basemap;

      MapEngine.switchBaseMap(type);

      const panel=$("basemapPanel");

      if(panel){

        panel.classList.remove("active");

      }

    };

  });

}


window.addEventListener("load", async () => {

  /* Splash luôn là màn hình đầu tiên */

  show("screenSplash");

  bindButtons();

  /* Khởi tạo HUD GPS */

  updateGPSStatus("GPS chưa kết nối");

  try{

    await DB.initDatabase();

    dbReady = true;

    /* Đọc trạng thái Project */

    await loadProjectState();

    console.log("================================");
    console.log("TGS PLATFORM GENESIS REV10");
    console.log("Startup : READY");
    console.log("Database: READY");
    console.log("ArcGIS  : READY");
    console.log("GPS     : READY");
    console.log("================================");

  }catch(err){

    console.error(err);

    alert("Không thể khởi tạo cơ sở dữ liệu Offline.");

  }

});

/* ==========================================================
   STARTUP ENTRY
========================================================== */

async function enterStartup(){

  await loadProjectState();

  renderSavedProjects();

  show("screenProjectHome");

}

/* ==========================================================
   QA UTILITIES
========================================================== */

function qaStatus(){

  return {

    revision : "REV10",

    startup  : true,

    database : dbReady,

    gps      : !!navigator.geolocation,

    arcgis   : true,

    draft    : startupState.draftProject,

    saved    : startupState.savedProjects.length

  };

}

window.TGS = {

  qaStatus,

  GPS,

  MapEngine,

  DB

};

console.log("TGS Genesis REV10 Loaded");
