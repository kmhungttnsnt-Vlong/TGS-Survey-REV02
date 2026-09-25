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
   GROUP 1 — CORE SYSTEM
   A2 — NAVIGATION ENGINE REV01
   BASELINE WEBAPP 2.0
   Status : QA
========================================================= */

/* =========================================================
   A2.1 NAVIGATION API
========================================================= */

function goHome(){

  showScreen("screenProjectHome");

}

function goProject(){

  showScreen("screenProject");

}

function goSurveyHome(){

  showScreen("screenSurveyHome");

}

function goLinear(){

  showScreen("screenLinear");

}

function goPoint(){

  showScreen("screenPoint");

}

/* =========================================================
   A2.2 BACK NAVIGATION
========================================================= */

function goBack(){

  switch(AppState.currentScreen){

    case "screenProject":
      goHome();
      break;

    case "screenSurveyHome":
      goProject();
      break;

    case "screenLinear":
      goSurveyHome();
      break;

    case "screenPoint":
      goSurveyHome();
      break;

    default:
      goHome();

  }

}

/* =========================================================
   A2.3 EVENT BINDING
========================================================= */

document.addEventListener("DOMContentLoaded",()=>{

  $("btnStart")?.addEventListener("click",goHome);

  $("btnNewProject")?.addEventListener("click",goProject);

  $("btnBackProject")?.addEventListener("click",goBack);

  $("btnBackSurvey")?.addEventListener("click",goBack);

  $("btnBackLinear")?.addEventListener("click",goBack);

  $("btnBackPoint")?.addEventListener("click",goBack);

  console.log("A2 Navigation Ready");

});

/* ======================== END A2 ========================= */
