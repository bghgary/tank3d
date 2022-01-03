import { Engine } from "@babylonjs/core/Engines/engine";
import { World } from "./world";

export function initialize(canvas: HTMLCanvasElement) {
    const engine = new Engine(canvas);

    const world = new World(engine);

    window.addEventListener("resize", () => {
        engine.resize();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            world.resume();
        } else {
            world.suspend();
        }
    });
}
