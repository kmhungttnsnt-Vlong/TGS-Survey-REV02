// ======================================================
// TGS Platform Genesis 2.0
// REV03-006B
// SPA + Leaflet Controller
// ======================================================

let currentProject = null;
let dbReady = false;
let map = null;
let marker = null;

const $ = (id) => document.getElementById(id);

const SCREENS = [
  "screenSplash",
  "screenProject",
  "screenSurveyHome",
  "screenPoint",
  "screenLinear"
];

function show(screenId){

  SCREENS.forEach(id=>{
    $(id).classList.remove("active");
  });

  $(screenId).classList.add("active");

  // Leaflet phải invalidate sau khi màn hình hiển thị
  if(screenId==="screenLinear"){
    setTimeout(()=>{
      initMap();
      map.invalidateSize(true);
    },250);
  }

}

function updateHome(){

  if(!currentProject) return;

  $("projectTitle").textContent =
    `${currentProject.projectName} (${currentProject.projectCode})`;

  $("linearProject").textContent =
    currentProject.projectName;

  $("recentSurvey").classList.remove("empty");

  $("recentSurvey").innerHTML = `
    <div style="padding:8px 0">
      <strong>${currentProject.projectName}</strong><br>
      <small>${currentProject.location || "Chưa có địa điểm"}</small>
    </div>
  `;

}

// ======================================================
// Leaflet
// ======================================================

function initMap(){

  if(map) return;

  const center=[10.762622,106.660172];

  map=L.map("map",{
    zoomControl:false,
    preferCanvas:true
  }).setView(center,18);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom:22,
      attribution:"© OpenStreetMap"
    }
  ).addTo(map);

  marker=L.marker(center).addTo(map);

  marker.bindPopup("D001 - Điểm đầu tuyến");

}

// ======================================================
// Boot
// ======================================================

window.onload=function(){

  show("screenSplash");

  DB.initDatabase()
    .then(async()=>{
      dbReady=true;
      currentProject=await DB.getLatestProject();
    })
    .catch(console.error);

  // Splash
  $("btnStart").onclick=()=>{

    if(currentProject){
      updateHome();
      show("screenSurveyHome");
    }else{
      show("screenProject");
    }

  };

  // Create project
  $("btnCreateProject").onclick=async()=>{

    if(!dbReady){
      alert("Offline DB đang khởi tạo...");
      return;
    }

    const name=$("projectName").value.trim();
    const code=$("projectCode").value.trim();

    if(name===""||code===""){
      alert("Nhập Tên và Mã công trình.");
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

  };

  // Point
  $("btnPoint").onclick=async()=>{

    currentProject.surveyMode="POINT";

    if(dbReady) await DB.updateProject(currentProject);

    show("screenPoint");

  };

  // Linear
  $("btnLinear").onclick=async()=>{

    currentProject.surveyMode="LINEAR";

    if(dbReady) await DB.updateProject(currentProject);

    show("screenLinear");

  };

  document.querySelectorAll(".back-btn").forEach(btn=>{

    btn.onclick=()=>show("screenSurveyHome");

  });

};
