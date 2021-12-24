import { Engine, KeyboardEventTypes, MeshBuilder, Scene } from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import { Player } from "./player";

import "@babylonjs/inspector";
import { Bullets } from "./bullets";

export class World {
    private readonly _scene: Scene;

    public constructor(engine: Engine) {
        this._scene = new Scene(engine);

        const bullets = new Bullets(this._scene);
        const player = new Player(this._scene, bullets);

        this._createGround();

        this._scene.createDefaultLight();

        this._scene.onKeyboardObservable.add((data) => {
            if (data.type === KeyboardEventTypes.KEYDOWN && data.event.ctrlKey && data.event.shiftKey && data.event.altKey && data.event.code === "KeyI") {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        engine.runRenderLoop(() => {
            this._scene.render();
        });
    }

    private _createGround(): void {
        const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this._scene);
        const material = new GridMaterial("ground", this._scene);
        // TODO: grid settings
        ground.material = material;
        ground.isPickable = true;
    }
}
