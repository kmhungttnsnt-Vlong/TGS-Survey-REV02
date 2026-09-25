/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   APP.JS
   BLOCK A1 REV04 (LOCKED)
   CORE FRAMEWORK
========================================================== */

/* ==========================================================
   A1.1 APPLICATION STATE
========================================================== */

const APP = {

    currentScreen : "screenSplash",

    currentProject : null,

    initialized : false

};

/* ==========================================================
   A1.2 DOM HELPER
========================================================== */

function $(id){

    return document.getElementById(id);

}

/* ==========================================================
   A1.3 SCREEN REGISTRY
========================================================== */

const SCREEN_IDS = [

    "screenSplash",

    "screenProjectHome",

    "screenProject",

    "screenSurveyHome",

    "screenPoint",

    "screenLinear"

];

/* ==========================================================
   A1.4 SCREEN ROUTER
========================================================== */

function showScreen(screenId){

    SCREEN_IDS.forEach(id=>{

        const el = $(id);

        if(el){

            el.classList.remove("active");

        }

    });

    const target = $(screenId);

    if(target){

        target.classList.add("active");

        APP.currentScreen = screenId;

    }

}

/* ==========================================================
   A1.5 CORE INITIALIZATION
========================================================== */

function initApp(){

    if(APP.initialized) return;

    APP.initialized = true;

    showScreen("screenSplash");

    console.log("TGS A1 REV04 READY");

}

/* ==========================================================
   A1.6 BOOTSTRAP
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    initApp

);

/* ================= END A1 ================= */

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

async function goHome() {

    if (typeof loadDraftBanner === "function") {
        await refreshHome();
    }

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
/* ==========================================================
   APP.JS — A3
   Project Workflow
   Baseline: TGS Genesis REV01
   Phụ thuộc: db.js + A1 + A2
========================================================== */

/* =========================
   LOAD DRAFT BANNER
========================= */

async function loadDraftBanner(){

    const draft = await DB.getDraft();

    if(draft){

        App.project = draft;

        $("draftBanner")?.classList.remove("hidden");

    }else{

        $("draftBanner")?.classList.add("hidden");

    }

}

/* =========================
   CREATE PROJECT
========================= */

async function createNewProject(){

    ...

    App.project = project;

    $("surveyProjectTitle").textContent = project.name;
    $("linearProjectName").textContent = project.name;

    clearProjectForm();          // ← thêm đúng dòng này

    showScreen("screenSurveyHome");

}

    const project = await DB.createProject({

        name,
        code,
        location

    });

    App.project = project;

    $("surveyProjectTitle").textContent = project.name;
    $("linearProjectName").textContent = project.name;

    showScreen("screenSurveyHome");

}

/* =========================
   CONTINUE DRAFT
========================= */

async function continueDraft(){

    const draft = await DB.getDraft();

    if(!draft){

        alert("Không có công trình chưa hoàn thành");
        return;

    }

    App.project = draft;

    $("surveyProjectTitle").textContent = draft.name;
    $("linearProjectName").textContent = draft.name;

    showScreen("screenSurveyHome");

}

/* =========================
   SAVED PROJECTS
========================= */

async function openSavedProjects(){

    const projects = await DB.getAll();

    const completed = projects.filter(
        p=>p.status==="completed"
    );

    if(completed.length===0){

        alert("Chưa có công trình đã lưu");
        return;

    }

    const p = completed[0];

    App.project = p;

    $("surveyProjectTitle").textContent = p.name;
    $("linearProjectName").textContent = p.name;
   
    clearProjectForm();
    showScreen("screenSurveyHome");

}

/* =========================
   BIND A3
========================= */

document.addEventListener("DOMContentLoaded", async ()=>{

    await DB.init();

    await loadDraftBanner();

    $("btnSaveProject")?.addEventListener(
        "click",
        createNewProject
    );

    $("btnContinueDraft")?.addEventListener(
        "click",
        continueDraft
    );

    $("btnOpenProject")?.addEventListener(
        "click",
        openSavedProjects
    );

});
/* ==========================================================
   A3.1 — FORM CONTROLLER
========================================================== */

function clearProjectForm(){

    $("projectName").value = "";
    $("projectCode").value = "";
    $("projectLocation").value = "";

}

/* ==========================================================
   A3.2 — HOME REFRESH
========================================================== */

async function refreshHome(){

    await loadDraftBanner();

    showScreen("screenProjectHome");

}
