import "@babylonjs/inspector";
import { Engine, HemisphericLight, KeyboardEventTypes, MeshBuilder, Observable, Scene, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";
import { Player } from "./player";
import { Shapes } from "./shapes";
import { Collisions } from "./collisions";
import { Sources } from "./sources";
import { Crashers } from "./crashers";

function now(): number {
    return performance.now() * 0.001;
}

export class World {
    private readonly _engine: Engine;
    private readonly _renderLoop: () => void;
    private _previousTime: number;

    public constructor(engine: Engine, size = 100) {
        this._engine = engine;

        this.size = size;
        this.scene = new Scene(engine);
        this.sources = new Sources(this);
        this.uiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        this.collisions = new Collisions(this);

        const shapes = new Shapes(this, 200);
        const crashers = new Crashers(this);
        const player = new Player(this, shapes, crashers);

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

        this._previousTime = now();
        this._renderLoop = () => {
            const currentTime = now();
            const deltaTime = Math.min(currentTime - this._previousTime);
            this._previousTime = currentTime;

            shapes.update(deltaTime);
            player.update(deltaTime);
            crashers.update(deltaTime, player);

            this.collisions.update(deltaTime);

            this.scene.render(false);
        };

        engine.runRenderLoop(this._renderLoop);
    }

    public readonly size: number;
    public readonly scene: Scene;
    public readonly sources: Sources;
    public readonly uiTexture: AdvancedDynamicTexture;
    public readonly collisions: Collisions;

    public suspend(): void {
        this._engine.stopRenderLoop(this._renderLoop);
    }

    public resume(): void {
        this._previousTime = now();
        this._engine.runRenderLoop(this._renderLoop);
    }

    private _createGround(): void {
        const bufferedSize = this.size * 2;
        const ground = MeshBuilder.CreateGround("ground", { width: bufferedSize, height: bufferedSize }, this.scene);
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
