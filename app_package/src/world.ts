import { Engine, MeshBuilder, Scene } from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import { Tank } from "./tank";

export class World {
    public readonly scene: Scene;

    public constructor(engine: Engine) {
        this.scene = new Scene(engine);

        const tank = new Tank("tank", { barrelDiameter: 0.45, barrelLength: 0.75 }, this.scene);
        //this._mesh.position.y = 0.6;

        this._createGround();

        this.scene.createDefaultCamera(true, undefined, true);
        this.scene.createDefaultLight();

        this.scene.debugLayer.show();

        engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    private _createGround(): void {
        const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
        const material = new GridMaterial("ground", this.scene);
        // TODO: grid settings
        ground.material = material;
    }
}
