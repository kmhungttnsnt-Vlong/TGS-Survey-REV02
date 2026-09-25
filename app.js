/* =========================================================
   CORE SYSTEM
   A1 — CORE BOOTSTRAP REV01
   Status : LOCKED
   ========================================================= */

'use strict';

/* ---------- DOM Helper ---------- */
const $ = (id) => document.getElementById(id);

/* ---------- Screen Registry ---------- */
const SCREENS = [
  "screenSplash",
  "screenProjectHome",
  "screenProject",
  "screenSurveyHome",
  "screenLinear",
  "screenPoint"
];

/* ---------- Global App State ---------- */
const AppState = {

  currentScreen : "screenSplash",

  project : {
    id        : null,
    name      : "",
    code      : "",
    location  : "",
    status    : "draft"
  },

  survey : {
    type      : null,
    pointCount: 0,
    length    : 0
  },

  gps : {
    latitude  : null,
    longitude : null,
    accuracy  : null,
    active    : false
  }

};

/* ---------- Screen Controller ---------- */
function showScreen(screenId){

  SCREENS.forEach(id=>{
    $(id)?.classList.remove("active");
  });

  $(screenId)?.classList.add("active");

  AppState.currentScreen = screenId;
}

/* ---------- App Ready ---------- */
console.log("TGS Platform Genesis 2.0");
console.log("A1 Core Bootstrap Ready");
