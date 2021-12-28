import "@babylonjs/inspector";
import { Engine, HemisphericLight, KeyboardEventTypes, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import { Player } from "./player";
import { Shapes } from "./shapes";
import { Collisions } from "./collisions";

export class World {
    private readonly _scene: Scene;
    private readonly _collisions: Collisions;
    private readonly _size = 100;

    public constructor(engine: Engine) {
        this._scene = new Scene(engine);
        this._collisions = new Collisions(this);

        const player = new Player(this);
        const shapes = new Shapes(this, 200);

        this._createGround();

        new HemisphericLight("hemisphericLight", new Vector3(0.1, 1, 0.1), this._scene);

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

    public get scene(): Scene {
        return this._scene;
    }

    public get collisions(): Collisions {
        return this._collisions;
    }

    public get size(): number {
        return this._size;
    }

    private _createGround(): void {
        const sizeWithBuffer = this._size * 2;
        const ground = MeshBuilder.CreateGround("ground", { width: sizeWithBuffer, height: sizeWithBuffer }, this._scene);
        ground.visibility = 0;

        const mesh = MeshBuilder.CreateGround("mesh", { width: this._size, height: this._size }, this._scene);
        mesh.parent = ground;
        mesh.position.y = -1;

        const material = new GridMaterial("ground", this._scene);
        // TODO: grid settings
        mesh.material = material;
        mesh.isPickable = false;
    }
}
