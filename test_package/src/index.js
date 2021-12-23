import { initialize } from "app_package";

document.title = "tank3d.io";

document.body.style.position = "fixed";
document.body.style.width = "100%";
document.body.style.height = "100%";
document.body.style.margin = "0";
document.body.style.padding = "0";

const canvas = document.createElement("canvas");
canvas.id = "renderCanvas";
canvas.style.border = "0";
canvas.style.outline = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
document.body.appendChild(canvas);

initialize(canvas);

canvas.focus();