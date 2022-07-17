import { initialize } from "app";

document.body.style.position = "fixed";
document.body.style.width = "100%";
document.body.style.height = "100%";
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.overflow = "hidden";
const canvas = document.createElement("canvas");
canvas.id = "renderCanvas";
canvas.style.border = "0";
canvas.style.outline = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.oncontextmenu = () => false;
document.body.appendChild(canvas);

initialize(canvas);

canvas.focus();