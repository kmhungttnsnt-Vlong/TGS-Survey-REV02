/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   APP.JS BASELINE REV01
   ========================================================== */

/* ==========================================================
   A. CORE STATE
   ========================================================== */

const AppState = {
    currentProject: null,
    draftProject: null,
    projects: [],
    map: null,
    gpsMarker: null,
    gpsCircle: null
};

/* ==========================================================
   B. SCREEN ROUTER
   ========================================================== */

const Screens = {};

document.querySelectorAll(".screen").forEach(s => {
    Screens[s.id] = s;
});

function showScreen(id){

    Object.values(Screens).forEach(s=>{
        s.classList.remove("active");
    });

    Screens[id].classList.add("active");

    if(id==="screenLinear"){
        setTimeout(initMap,250);
    }
}

/* ==========================================================
   C. NAVIGATION
   ========================================================== */

function bindNavigation(){

    // Splash
    btnStart.onclick=()=>showScreen("screenProjectHome");

    // Home
    btnNewProject.onclick=()=>showScreen("screenProject");

    btnContinueDraft.onclick=resumeDraft;

    btnOpenProject.onclick=openSavedProjects;

    // Project
    btnBackHome.onclick=()=>showScreen("screenProjectHome");

    btnSaveProject.onclick=createProject;

    // Survey
    btnBackProject.onclick=()=>showScreen("screenProjectHome");

    btnPointSurvey.onclick=()=>showScreen("screenPoint");

    btnLinearSurvey.onclick=()=>{
        linearProjectName.textContent=
            AppState.currentProject.name;
        showScreen("screenLinear");
    };

    btnExitLinear.onclick=()=>showScreen("screenSurveyHome");

    btnExitPoint.onclick=()=>showScreen("screenSurveyHome");
}

/* ==========================================================
   D. PROJECT CONTROLLER
   ========================================================== */

function createProject(){

    const name=projectName.value.trim();
    const code=projectCode.value.trim();
    const location=projectLocation.value.trim();

    if(!name){
        alert("Nhập tên công trình");
        return;
    }

    const project={
        id:Date.now(),
        name,
        code,
        location,
        status:"draft",
        created:new Date().toISOString()
    };

    AppState.currentProject=project;
    AppState.draftProject=project;

    localStorage.setItem(
        "TGS_DRAFT",
        JSON.stringify(project)
    );

    surveyProjectTitle.textContent=name;

    showScreen("screenSurveyHome");
}

/* ==========================================================
   E. DRAFT RESUME
   ========================================================== */

function loadDraft(){

    const raw=localStorage.getItem("TGS_DRAFT");

    if(!raw){
        draftBanner.classList.add("hidden");
        return;
    }

    AppState.draftProject=JSON.parse(raw);

    draftBanner.classList.remove("hidden");
}

function resumeDraft(){

    AppState.currentProject=AppState.draftProject;

    surveyProjectTitle.textContent=
        AppState.currentProject.name;

    showScreen("screenSurveyHome");
}

/* ==========================================================
   F. SAVED PROJECT
   ========================================================== */

function openSavedProjects(){

    const list=
        JSON.parse(localStorage.getItem("TGS_PROJECTS")||"[]");

    if(list.length===0){
        alert("Chưa có công trình đã lưu");
        return;
    }

    const p=list[0];

    AppState.currentProject=p;

    surveyProjectTitle.textContent=p.name;

    showScreen("screenSurveyHome");
}

/* ==========================================================
   G. SURVEY CONTROLLER
   ========================================================== */

function initSurveyButtons(){

    btnLocate.onclick=getCurrentLocation;

    btnZoomIn.onclick=()=>{
        if(AppState.map) AppState.map.zoomIn();
    };

    btnZoomOut.onclick=()=>{
        if(AppState.map) AppState.map.zoomOut();
    };

    btnAcquireGPS.onclick=startGPSAcquisition;
}

/* ==========================================================
   H. LINEAR GIS
   ========================================================== */

function initMap(){

    if(AppState.map){
        AppState.map.invalidateSize();
        return;
    }

    AppState.map=L.map("map",{
        zoomControl:false
    }).setView([9.923,106.31],16);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom:20
        }
    ).addTo(AppState.map);
}

function getCurrentLocation(){

    if(!navigator.geolocation){
        alert("Thiết bị không hỗ trợ GPS");
        return;
    }

    navigator.geolocation.getCurrentPosition(pos=>{

        const lat=pos.coords.latitude;
        const lng=pos.coords.longitude;
        const acc=pos.coords.accuracy;

        updateGPS(lat,lng,acc);

        AppState.map.setView([lat,lng],18);

    },()=>{

        alert("Không lấy được vị trí");

    },{
        enableHighAccuracy:true,
        timeout:8000
    });
}

function updateGPS(lat,lng,accuracy){

    gpsText.textContent=
        `Lat ${lat.toFixed(6)} · Lon ${lng.toFixed(6)}`;

    gpsAccuracy.textContent=
        `± ${Math.round(accuracy)} m`;

    if(AppState.gpsMarker){
        AppState.map.removeLayer(AppState.gpsMarker);
        AppState.map.removeLayer(AppState.gpsCircle);
    }

    AppState.gpsMarker=L.circleMarker([lat,lng],{
        radius:6,
        color:"#2563eb",
        fillColor:"#2563eb",
        fillOpacity:1
    }).addTo(AppState.map);

    AppState.gpsCircle=L.circle([lat,lng],{
        radius:Math.max(accuracy,5),
        color:"#3b82f6",
        weight:1,
        fillOpacity:0.08
    }).addTo(AppState.map);
}

function startGPSAcquisition(){

    let count=0;

    btnAcquireGPS.disabled=true;

    const timer=setInterval(()=>{

        count++;

        gpsText.textContent=
            `Đang đo ${count}/20`;

        if(navigator.geolocation){

            navigator.geolocation.getCurrentPosition(pos=>{

                updateGPS(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    pos.coords.accuracy
                );

            });
        }

        if(count>=20){

            clearInterval(timer);

            btnAcquireGPS.disabled=false;

            gpsText.textContent="GPS hoàn tất";
        }

    },300);
}

/* ==========================================================
   I. BOOTSTRAP
   ========================================================== */

window.onload=()=>{

    bindNavigation();

    initSurveyButtons();

    loadDraft();

    console.log("TGS Genesis REV01 READY");
};
