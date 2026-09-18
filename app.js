/* ==========================================================
   TGS Platform Genesis 2.0
   TGS02-WEB-LINEAR-004
   app.js
   REV02
========================================================== */

let currentProject = null;
let dbReady = false;

const $ = (id) => document.getElementById(id);

/* ==========================================================
   LEAFLET DEFAULT ICON (CDN FIX)
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
    if (el) el.classList.remove("active");
  });

  $(screenId).classList.add("active");

  if (screenId === "screenLinear") {
    setTimeout(() => MapEngine.initialize(), 200);
  }

}

/* ==========================================================
   MAP ENGINE
========================================================== */

const MapEngine = {

  map: null,
  marker: null,

  defaultLocation: [10.762622,106.660172],

  initialize(){

    if(this.map){
      this.map.invalidateSize();
      return;
    }

    this.map=L.map("map",{
      zoomControl:false
    }).setView(this.defaultLocation,18);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom:22,
        attribution:"© OpenStreetMap"
      }
    ).addTo(this.map);

    this.marker=L.marker(this.defaultLocation).addTo(this.map);

    this.marker.bindPopup("D001 - Điểm đầu tuyến");

    this.marker.openPopup();

  },

  zoomIn(){

    if(this.map) this.map.zoomIn();

  },

  zoomOut(){

    if(this.map) this.map.zoomOut();

  },

  locate(){

    if(!this.map) return;

    this.map.flyTo(this.defaultLocation,19,{
      duration:1
    });

  }

};

/* ==========================================================
   PROJECT
========================================================== */

function updateHome(){

  if(!currentProject) return;

  $("projectTitle").textContent=currentProject.projectName;

  $("linearProject").textContent=currentProject.projectName;

}

async function createProject(){

  if(!dbReady){
    alert("Offline Database chưa sẵn sàng.");
    return;
  }

  const name=$("projectName").value.trim();
  const code=$("projectCode").value.trim();

  if(name===""||code===""){
    alert("Nhập tên và mã công trình.");
    return;
  }

  currentProject=await DB.createProject({
    projectName:name,
    projectCode:code,
    location:$("projectLocation").value.trim(),
    organization:$("organization").value.trim()
  });

  updateHome();

  show("screenSurveyHome");

}

/* ==========================================================
   BUTTON EVENT
========================================================== */

function bindButtons(){

  $("btnStart").onclick=()=>{

    if(currentProject){

      updateHome();

      show("screenSurveyHome");

    }else{

      show("screenProject");

    }

  };

  $("btnCreateProject").onclick=createProject;

  $("btnPoint").onclick=()=>show("screenPoint");

  $("btnLinear").onclick=()=>show("screenLinear");

  document.querySelectorAll(".back-btn").forEach(btn=>{

    btn.onclick=()=>show("screenSurveyHome");

  });

  $("btnZoomIn").onclick=()=>MapEngine.zoomIn();

  $("btnZoomOut").onclick=()=>MapEngine.zoomOut();

  $("btnLocate").onclick=()=>MapEngine.locate();

  $("btnFirstGPS").onclick=()=>{

    alert("REV05 sẽ lấy GPS thật của thiết bị.");

  };

}

/* ==========================================================
   BOOT
========================================================== */

window.addEventListener("load",async()=>{

  show("screenSplash");

  bindButtons();

  try{

    await DB.initDatabase();

    dbReady=true;

    currentProject=await DB.getLatestProject();

  }catch(err){

    console.error(err);

    alert("Không thể khởi tạo bộ nhớ Offline.");

  }

});
