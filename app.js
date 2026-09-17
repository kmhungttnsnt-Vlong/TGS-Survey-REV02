/* ==========================================================
   TGS PLATFORM — SURVEY REV02
   Camera Session Engine
========================================================== */

let survey = null;
let stream = null;

let seconds = 0;
let timer = null;

let paused = false;

let gps = null;

/* ---------------- DOM ---------------- */

const $ = id => document.getElementById(id);

const setupScreen = $("setupScreen");
const surveyScreen = $("surveyScreen");
const timelineScreen = $("timelineScreen");
const resumeCard = $("resumeCard");

const video = $("camera");
const canvas = $("captureCanvas");

const timerLabel = $("timer");
const gpsStatus = $("gpsStatus");
const recDot = $("recDot");
const recordState = $("recordState");

const itemContainer = $("itemContainer");
const timeline = $("timeline");

/* ---------------- Khởi động ---------------- */

window.onload = async () => {

    await initDB();

    const pausedSurvey = await getPausedSurvey();

    if (pausedSurvey) {

        survey = pausedSurvey;

        resumeCard.classList.remove("hidden");

    }

};

/* ---------------- Hạng mục ---------------- */

function createItemUI() {

    const wrap = document.createElement("div");

    wrap.className = "itemBlock";

    wrap.innerHTML = `
        <input class="itemName" placeholder="Tên Hạng mục">

        <input class="partName" placeholder="Bộ phận đầu tiên">
    `;

    itemContainer.appendChild(wrap);

}

$("addItemBtn").onclick = createItemUI;

createItemUI();

/* ---------------- GPS ---------------- */

function getGPS() {

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(pos => {

        gps = {

            lat: pos.coords.latitude,

            lng: pos.coords.longitude,

            accuracy: pos.coords.accuracy

        };

        gpsStatus.innerText = "GPS ✓";

    }, () => {

        gpsStatus.innerText = "GPS ?";

    });

}

/* ---------------- Camera ---------------- */

async function openCamera() {

    stream = await navigator.mediaDevices.getUserMedia({

        video: {

            facingMode: "environment"

        },

        audio: true

    });

    video.srcObject = stream;

}

/* ---------------- Đồng hồ ---------------- */

function startREC() {

    paused = false;

    recDot.classList.add("recording");

    recordState.innerText = "REC";

    timer = setInterval(() => {

        if (paused) return;

        seconds++;

        const m = String(Math.floor(seconds / 60)).padStart(2, "0");
        const s = String(seconds % 60).padStart(2, "0");

        timerLabel.innerText = `${m}:${s}`;

    }, 1000);

}

function stopREC() {

    clearInterval(timer);

}

/* ---------------- Khởi tạo khảo sát ---------------- */

$("startSurveyBtn").onclick = async () => {

    const project = $("projectName").value.trim();

    if (project === "") {

        alert("Nhập tên công trình.");

        return;

    }

    survey = createEmptySurvey();

    survey.projectName = project;

    survey.status = "RECORDING";

    document.querySelectorAll(".itemBlock").forEach(block => {

        const item = block.querySelector(".itemName").value;

        const part = block.querySelector(".partName").value;

        survey.items.push({

            item,
            part

        });

    });

    await saveSurvey(survey);

    setupScreen.classList.add("hidden");

    surveyScreen.classList.remove("hidden");

    timelineScreen.classList.remove("hidden");

    if (survey.items.length > 0) {

        $("currentItem").innerText = survey.items[0].item || "-";
        $("currentPart").innerText = survey.items[0].part || "-";

    }

    getGPS();

    await openCamera();

    startREC();

};

/* ---------------- Chụp ảnh ---------------- */

$("captureBtn").onclick = async () => {

    if (!stream) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    const image = canvas.toDataURL("image/jpeg", 0.9);

    const photo = {

        time: timerLabel.innerText,

        gps,
        image

    };

    survey.photos.push(photo);

    survey.updatedAt = Date.now();

    await saveSurvey(survey);

    navigator.vibrate?.(80);

    renderPhoto(photo);

    $("photoCount").innerText = `${survey.photos.length} ảnh`;

};

/* ---------------- Timeline ---------------- */

function renderPhoto(photo) {

    const card = document.createElement("div");

    card.className = "photoCard";

    card.innerHTML = `
        <img src="${photo.image}">
        <div class="photoInfo">
            <b>${photo.time}</b>
        </div>
    `;

    timeline.prepend(card);

}

/* ---------------- Pause ---------------- */

$("pauseBtn").onclick = async () => {

    paused = true;

    survey.status = "PAUSED";

    survey.updatedAt = Date.now();

    await saveSurvey(survey);

    recordState.innerText = "PAUSE";

    $("pauseBtn").classList.add("hidden");

    $("resumeBtn").classList.remove("hidden");

};

$("resumeBtn").onclick = async () => {

    paused = false;

    survey.status = "RECORDING";

    survey.updatedAt = Date.now();

    await saveSurvey(survey);

    recordState.innerText = "REC";

    $("resumeBtn").classList.add("hidden");

    $("pauseBtn").classList.remove("hidden");

};

/* ---------------- Chuyển bộ phận ---------------- */

$("nextPartBtn").onclick = () => {

    const idx = survey.items.findIndex(x =>
        x.part === $("currentPart").innerText
    );

    if (idx + 1 >= survey.items.length) {

        alert("Đã là bộ phận cuối.");

        return;

    }

    $("currentItem").innerText = survey.items[idx + 1].item;
    $("currentPart").innerText = survey.items[idx + 1].part;

};

/* ---------------- Hoàn thành ---------------- */

$("finishBtn").onclick = async () => {

    stopREC();

    stream?.getTracks().forEach(t => t.stop());

    survey.status = "COMPLETED";
    survey.updatedAt = Date.now();

    await saveSurvey(survey);

    alert("✓ Đã lưu an toàn vào bộ nhớ thiết bị.");

    exportJSON();

    location.reload();

};

/* ---------------- Resume ---------------- */

$("resumeSurveyBtn").onclick = async () => {

    resumeCard.classList.add("hidden");

    setupScreen.classList.add("hidden");

    surveyScreen.classList.remove("hidden");

    timelineScreen.classList.remove("hidden");

    seconds = 0;

    await openCamera();

    getGPS();

    survey.status = "RECORDING";

    await saveSurvey(survey);

    survey.photos.forEach(renderPhoto);

    $("photoCount").innerText = `${survey.photos.length} ảnh`;

    startREC();

};

$("newSurveyBtn").onclick = async () => {

    await deleteSurvey(survey.id);

    location.reload();

};

/* ---------------- JSON ---------------- */

function exportJSON() {

    const blob = new Blob(

        [JSON.stringify(survey, null, 2)],

        {

            type: "application/json"

        }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `${survey.id}.json`;

    a.click();

    URL.revokeObjectURL(url);

}
