import { Engine } from "@babylonjs/core/Engines/engine";
import { StandardWorld } from "./worlds/standardWorld";

export function initialize(canvas: HTMLCanvasElement): void {
    const engine = new Engine(canvas);

    const world = new StandardWorld(engine);

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
