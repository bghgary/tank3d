import { Engine } from "@babylonjs/core/Engines/engine";
import { World } from "./world";

declare const VERSION: number;

export function initialize(canvas: HTMLCanvasElement): void {
    console.log(`tank3d v${VERSION}`);

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
