import "@babylonjs/inspector";
import { Engine, HemisphericLight, KeyboardEventTypes, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";
import { Player } from "./player";
import { Shapes } from "./shapes";
import { Collisions } from "./collisions";
import { Sources } from "./sources";

export class World {
    public constructor(engine: Engine, size = 100) {
        this.size = size;
        this.scene = new Scene(engine);
        this.sources = new Sources(this);
        this.uiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        this.collisions = new Collisions(this);
        this.shapes = new Shapes(this, 200);

        const player = new Player(this);

        this._createGround();

        new HemisphericLight("hemisphericLight", new Vector3(0.1, 1, 0.1), this.scene);

        this.scene.onKeyboardObservable.add((data) => {
            if (data.type === KeyboardEventTypes.KEYDOWN && data.event.ctrlKey && data.event.shiftKey && data.event.altKey && data.event.code === "KeyI") {
                if (this.scene.debugLayer.isVisible()) {
                    this.scene.debugLayer.hide();
                } else {
                    this.scene.debugLayer.show();
                }
            }
        });

        engine.runRenderLoop(() => {
            this.scene.render();
        });
   }

    public readonly size: number;
    public readonly scene: Scene;
    public readonly sources: Sources;
    public readonly uiTexture: AdvancedDynamicTexture;
    public readonly collisions: Collisions;
    public readonly shapes: Shapes;

    private _createGround(): void {
        const sizeWithBuffer = this.size * 2;
        const ground = MeshBuilder.CreateGround("ground", { width: sizeWithBuffer, height: sizeWithBuffer }, this.scene);
        ground.visibility = 0;

        const mesh = MeshBuilder.CreateGround("mesh", { width: this.size, height: this.size }, this.scene);
        mesh.parent = ground;
        mesh.position.y = -1;

        const material = new GridMaterial("ground", this.scene);
        // TODO: grid settings
        mesh.material = material;
        mesh.isPickable = false;
    }
}
