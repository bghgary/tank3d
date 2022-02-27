import { Engine } from "@babylonjs/core/Engines/engine";
import { BoxWorld } from "./worlds/boxWorld";

export function initialize(canvas: HTMLCanvasElement): void {
    const engine = new Engine(canvas);

    const world = new BoxWorld(engine);

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
