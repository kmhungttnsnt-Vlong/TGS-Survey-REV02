/* =========================================================
   GROUP 1 — CORE SYSTEM
   A1 — CORE BOOTSTRAP REV02
   BASELINE WEBAPP 2.0
   Status : LOCKED
========================================================= */

'use strict';

/* =========================================================
   A1.1 DOM HELPER
========================================================= */

const $ = (id) => document.getElementById(id);

/* =========================================================
   A1.2 SCREEN REGISTRY
========================================================= */

const SCREENS = [
  "screenSplash",
  "screenProjectHome",
  "screenProject",
  "screenSurveyHome",
  "screenLinear",
  "screenPoint"
];

/* =========================================================
   A1.3 GLOBAL APPLICATION STATE
========================================================= */

const AppState = {

  currentScreen : "screenSplash",

  project : {
    id       : null,
    name     : "",
    code     : "",
    location : "",
    status   : "draft"
  },

  survey : {
    type       : null,
    pointCount : 0,
    length     : 0
  },

  gps : {
    latitude  : null,
    longitude : null,
    accuracy  : null,
    active    : false
  }

};

/* =========================================================
   A1.4 SCREEN CONTROLLER
========================================================= */

function showScreen(screenId){

  SCREENS.forEach(id=>{
    $(id)?.classList.remove("active");
  });

  $(screenId)?.classList.add("active");

  AppState.currentScreen = screenId;

}

/* =========================================================
   A1.5 SPLASH BOOTSTRAP
========================================================= */

function bootSplash(){

  showScreen("screenSplash");

}

/* =========================================================
   A1.6 SYSTEM READY
========================================================= */

document.addEventListener("DOMContentLoaded",()=>{

  bootSplash();

  console.log("TGS Platform Genesis 2.0");
  console.log("Baseline WebApp 2.0");
  console.log("A1 Core Bootstrap Ready");

});

/* ======================== END A1 ========================= */

/* =========================================================
   CORE SYSTEM
   A2 — NAVIGATION ENGINE REV02
   Status : QA
   Theo WA2 / TGS-HO-301
   Trách nhiệm:
   - Điều hướng giữa các màn hình
   - Back Navigation
   - Gắn Event Listener
   Không làm:
   - DB
   - GPS
   - Leaflet
   - Lưu dữ liệu
========================================================= */

/* ---------- Public API ---------- */

function goHome() {
  showScreen("screenProjectHome");
}

function goProject() {
  showScreen("screenProject");
}

function goSurveyHome() {
  showScreen("screenSurveyHome");
}

function goLinear() {
  showScreen("screenLinear");
}

function goPoint() {
  showScreen("screenPoint");
}

function goSavedProject() {
  showScreen("screenSavedProject");
}

/* ---------- Event Binding ---------- */

function bindNavigation() {

  // Splash
  $("btnStart")?.addEventListener("click", goHome);

  // Home
  $("btnNewProject")?.addEventListener("click", goProject);
  $("btnOpenProject")?.addEventListener("click", goSavedProject);

  // Project
  $("btnBackProject")?.addEventListener("click", goHome);

  // Lưu project -> chỉ điều hướng
  $("btnSaveProject")?.addEventListener("click", goSurveyHome);

  // Survey Home
  $("btnBackSurvey")?.addEventListener("click", goProject);
  $("btnSurveyLine")?.addEventListener("click", goLinear);
  $("btnSurveyPoint")?.addEventListener("click", goPoint);

  // Linear
  $("btnBackLinear")?.addEventListener("click", goSurveyHome);

  // Point
  $("btnBackPoint")?.addEventListener("click", goSurveyHome);

  // Saved Project
  $("btnBackSaved")?.addEventListener("click", goHome);
}

/* ---------- Initialize ---------- */

bindNavigation();

console.log("A2 Navigation Ready");
