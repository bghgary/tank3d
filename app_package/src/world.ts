import "@babylonjs/inspector";
import { Engine, HemisphericLight, KeyboardEventTypes, MeshBuilder, Observable, Scene, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";
import { Player } from "./player";
import { Shapes } from "./shapes";
import { Collisions } from "./collisions";
import { Sources } from "./sources";
import { Crashers } from "./crashers";
import { Bullets } from "./bullets";

export const enum RenderingGroupId {
    OuterGrid,
    InnerGrid,
    Entity
}

function now(): number {
    return performance.now() * 0.001;
}

export class World {
    private readonly _engine: Engine;
    private _previousTime = 0;
    private _suspended = false;
    private _paused = false;

    public constructor(engine: Engine, size = 100) {
        this._engine = engine;

        this.size = size;
        this.scene = new Scene(engine);
        this.sources = new Sources(this);
        this.uiTexture = AdvancedDynamicTexture.CreateFullscreenUI("Fullscreen");
        this.collisions = new Collisions(this);

        const shapes = new Shapes(this, 200);
        const bullets = new Bullets(this);
        const crashers = new Crashers(this, bullets, 100);
        const player = new Player(this, bullets, shapes, crashers);

        this._createGround();

        new HemisphericLight("light", new Vector3(0.1, 1, -0.5), this.scene);

        this.scene.onKeyboardObservable.add((data) => {
            if (data.type === KeyboardEventTypes.KEYDOWN && data.event.ctrlKey && data.event.shiftKey && data.event.altKey) {
                switch (data.event.code) {
                    case "KeyI": {
                        if (this.scene.debugLayer.isVisible()) {
                            this.scene.debugLayer.hide();
                        } else {
                            this.scene.debugLayer.show();
                        }
                        break;
                    }
                    case "KeyP": {
                        this.paused = !this.paused;
                        break;
                    }
                }
            }
        });

        this._previousTime = now();

        const renderLoop = () => {
            const currentTime = now();
            const deltaTime = Math.min(currentTime - this._previousTime);
            this._previousTime = currentTime;

            if (!this._suspended && !this._paused) {
                shapes.update(deltaTime);
                bullets.update(deltaTime);
                player.update(deltaTime);
                crashers.update(deltaTime, player);

                this.collisions.update(deltaTime);
            }

            this.scene.render(this._paused);
        };

        engine.runRenderLoop(renderLoop);
    }

    public readonly size: number;
    public readonly scene: Scene;
    public readonly sources: Sources;
    public readonly uiTexture: AdvancedDynamicTexture;
    public readonly collisions: Collisions;

    public suspend(): void {
        this._suspended = true;
    }

    public resume(): void {
        this._suspended = false;
        this._previousTime = now();
    }

    public get paused(): boolean {
        return this._paused;
    }

    public set paused(value: boolean) {
        if (this._paused !== value) {
            this._paused = value;
            this.onPausedStateChangedObservable.notifyObservers(this._paused);
        }
    }

    public onPausedStateChangedObservable = new Observable<boolean>();

    private _createGround(): void {
        const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, this.scene);
        ground.visibility = 0;

        const createGrid = (name: string, size: number, renderingGroupId: number, main: number, line: number): void => {
            const grid = MeshBuilder.CreateGround(name, { width: size, height: size }, this.scene);
            grid.renderingGroupId = renderingGroupId;
            grid.parent = ground;
            grid.position.y = -1;
            grid.isPickable = false;
            grid.doNotSyncBoundingInfo = true;
            grid.alwaysSelectAsActiveMesh = true;

            const material = new GridMaterial(name, this.scene);
            material.majorUnitFrequency = 0;
            material.mainColor.set(main, main, main);
            material.lineColor.set(line, line, line);
            material.disableDepthWrite = true;
            grid.material = material;
        }

        createGrid("innerGrid", this.size, RenderingGroupId.InnerGrid, 0.3, 0.15);
        createGrid("outerGrid", 1000, RenderingGroupId.OuterGrid, 0.2, 0.1);
    }
}
