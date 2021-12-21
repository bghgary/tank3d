import { Engine } from "@babylonjs/core";
import { World } from "./world";

export function initialize(canvas: HTMLCanvasElement) {
    const engine = new Engine(canvas);

    new World(engine);

    window.addEventListener("resize", () => {
        engine.resize();
    });
}

