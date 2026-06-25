const leftbtn = document.querySelector("#left-btn");
const rightbtn = document.querySelector("#right-btn");
const upbtn = document.querySelector("#up-btn");
const downbtn = document.querySelector("#down-btn");
const zinbtn = document.querySelector("#zoomin-btn");
const zoutbtn = document.querySelector("#zoomout-btn");
const rstbtn = document.querySelector("#rst-btn");
const byebtn = document.querySelector("#bye-btn");

leftbtn.addEventListener("click", panLeft);
rightbtn.addEventListener("click", panRight);
upbtn.addEventListener("click", tiltUp);
downbtn.addEventListener("click", tiltDown);
zinbtn.addEventListener("click", zoomIn);
zoutbtn.addEventListener("click", zoomOut);
rstbtn.addEventListener("click", resetCounter);
byebtn.addEventListener("click", shutDown);

function panLeft() {
    fetch("/control/pan/10000");
}

function panRight() {
    fetch("/control/pan/-10000");
}

function tiltUp() {
    fetch("/control/tilt/10000");
}

function tiltDown() {
    fetch("/control/tilt/-10000");
}

function zoomIn() {
    fetch("/control/zoom/10");
}

function zoomOut() {
    fetch("/control/zoom/-10");
}

function resetCounter() {
    fetch("/control/reset/0");
}

function shutDown() {
    fetch("/control/shutdown/0");
}
