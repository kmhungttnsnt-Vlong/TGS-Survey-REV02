/* ==========================================================
   TGS PLATFORM GENESIS 2.0
   APP.JS — A1 REV02
   CORE BOOTSTRAP + SCREEN ROUTER
   BASELINE LOCKED
========================================================== */

/* ==========================================================
   A1.1 APP STATE
========================================================== */

const APP = {

    currentScreen : "screenSplash",

    project : null

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

const SCREENS = [

    "screenSplash",

    "screenProjectHome",

    "screenProject",

    "screenSurveyHome",

    "screenPoint",

    "screenLinear"

];

/* ==========================================================
   A1.4 ROUTER
========================================================== */

function showScreen(id){

    SCREENS.forEach(screen=>{

        const el = $(screen);

        if(el) el.classList.remove("active");

    });

    const target = $(id);

    if(target){

        target.classList.add("active");

        APP.currentScreen = id;

    }

}

/* ==========================================================
   A1.5 BOOTSTRAP
========================================================== */

document.addEventListener("DOMContentLoaded",()=>{

    // Splash
    $("btnStart")?.addEventListener("click",goHome);

    // Home
    $("btnNewProject")?.addEventListener("click",goProject);

    $("btnContinueDraft")?.addEventListener("click",continueDraft);

    $("btnOpenProject")?.addEventListener("click",openSavedProjects);

    // Project
    $("btnBackHome")?.addEventListener("click",goHome);

    $("btnSaveProject")?.addEventListener("click",createNewProject);

    // Survey Home
    $("btnBackProject")?.addEventListener("click",goHome);

    $("btnPointSurvey")?.addEventListener("click",goPoint);

    $("btnLinearSurvey")?.addEventListener("click",goLinear);

    // Exit
    $("btnExitPoint")?.addEventListener("click",goSurvey);

    $("btnExitLinear")?.addEventListener("click",goSurvey);

    // Initial Screen
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
