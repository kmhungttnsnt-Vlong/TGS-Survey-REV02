/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   APP.JS — BASELINE REV01
   BLOCK A1 : CORE BOOTSTRAP
   ========================================================== */

const App = {
    currentScreen: "screenSplash",
    project: null
};

/* ==========================================================
   SCREEN REGISTRY
   ========================================================== */

const Screens = [
    "screenSplash",
    "screenProjectHome",
    "screenProject",
    "screenSurveyHome",
    "screenPoint",
    "screenLinear"
];

function $(id){
    return document.getElementById(id);
}

/* ==========================================================
   NAVIGATION
   ========================================================== */

function showScreen(id){

    Screens.forEach(screen=>{
        const el = $(screen);
        if(el) el.classList.remove("active");
    });

    const target = $(id);

    if(target){
        target.classList.add("active");
        App.currentScreen = id;
    }

}

/* ==========================================================
   BOOTSTRAP
   ========================================================== */

document.addEventListener("DOMContentLoaded", ()=>{

    // Splash
    $("btnStart")?.addEventListener("click", ()=>{
        showScreen("screenProjectHome");
    });

    // Project Home
    $("btnNewProject")?.addEventListener("click", ()=>{
        showScreen("screenProject");
    });

    $("btnContinueDraft")?.addEventListener("click", ()=>{
        showScreen("screenSurveyHome");
    });

    $("btnOpenProject")?.addEventListener("click", ()=>{
        alert("A1 QA: Chưa kích hoạt DB");
    });

    // Project
    $("btnBackHome")?.addEventListener("click", ()=>{
        showScreen("screenProjectHome");
    });

    $("btnSaveProject")?.addEventListener("click", ()=>{

        const name = $("projectName").value.trim();

        if(name===""){
            alert("Nhập tên công trình");
            return;
        }

        App.project = {
            name,
            code: $("projectCode").value.trim(),
            location: $("projectLocation").value.trim()
        };

        $("surveyProjectTitle").textContent = App.project.name;

        showScreen("screenSurveyHome");

    });

    // Survey Home
    $("btnBackProject")?.addEventListener("click", ()=>{
        showScreen("screenProject");
    });

    $("btnPointSurvey")?.addEventListener("click", ()=>{
        showScreen("screenPoint");
    });

    $("btnLinearSurvey")?.addEventListener("click", ()=>{
        showScreen("screenLinear");
    });

    // Exit Survey
    $("btnExitPoint")?.addEventListener("click", ()=>{
        showScreen("screenSurveyHome");
    });

    $("btnExitLinear")?.addEventListener("click", ()=>{
        showScreen("screenSurveyHome");
    });

    // Start screen
    showScreen("screenSplash");

});
/* =========================================================
   APP.JS — A2
   Navigation & Event Binding
   Baseline: GENESIS REV04
========================================================= */

const UI = {
  splash: document.getElementById("screenSplash"),
  home: document.getElementById("screenProjectHome"),
  project: document.getElementById("screenProject"),
  survey: document.getElementById("screenSurveyHome"),
  point: document.getElementById("screenPoint"),
  linear: document.getElementById("screenLinear")
};

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
  });

  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  APP.currentScreen = id;
}

/* -------- Navigation -------- */

function goHome() {
  showScreen("screenProjectHome");
}

function goProject() {
  showScreen("screenProject");
}

function goSurvey() {
  showScreen("screenSurveyHome");
}

function goLinear() {
  showScreen("screenLinear");
}

function goPoint() {
  showScreen("screenPoint");
}

/* -------- Bind Events -------- */

function bindNavigation() {

  // Splash
  $("#btnStart")?.addEventListener("click", goHome);

  // Home
  $("#btnNewProject")?.addEventListener("click", goProject);

  // Back
  $("#btnBackHome")?.addEventListener("click", goHome);

  $("#btnBackProject")?.addEventListener("click", goHome);

  $("#btnExitLinear")?.addEventListener("click", goSurvey);

  $("#btnExitPoint")?.addEventListener("click", goSurvey);

}
