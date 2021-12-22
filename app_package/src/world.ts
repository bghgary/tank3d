import { Engine, MeshBuilder, Scene } from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import { Player } from "./player";

import "@babylonjs/inspector";

export class World {
    private readonly _scene: Scene;

    public constructor(engine: Engine) {
        this._scene = new Scene(engine);

        const player = new Player(this._scene);

        this._createGround();

        this._scene.createDefaultLight();

        this._scene.debugLayer.show();

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
