import { Player } from "./player";
import { Shapes } from "./shapes";
import { Collisions } from "./collisions";
import { Sources } from "./sources";
import { Crashers } from "./crashers";
import { Bullets } from "./bullets";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { Observable } from "@babylonjs/core/Misc/observable";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { CreateGridMaterial } from "./materials/gridMaterial";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Control, TextBlock } from "@babylonjs/gui";

declare const VERSION: string;
declare const DEV_BUILD: boolean;

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
        this.collisions = new Collisions(this);
        this.uiContainer = AdvancedDynamicTexture.CreateFullscreenUI("Fullscreen").rootContainer;

        const shapes = new Shapes(this, 200);
        const bullets = new Bullets(this);
        const crashers = new Crashers(this, bullets, 100);
        const player = new Player(this, bullets, shapes, crashers);

        this._createGround();

        new HemisphericLight("light", new Vector3(0.1, 1, -0.5), this.scene);

        const versionTextBlock = new TextBlock("version", VERSION);
        versionTextBlock.resizeToFit = true;
        versionTextBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        versionTextBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        versionTextBlock.topInPixels = 4;
        versionTextBlock.leftInPixels = -4;
        versionTextBlock.fontSizeInPixels = 12;
        versionTextBlock.color = "gray";
        versionTextBlock.shadowBlur = 4;
        this.uiContainer.addControl(versionTextBlock);

        this.scene.onKeyboardObservable.add((data) => {
            if (data.type === KeyboardEventTypes.KEYDOWN && data.event.ctrlKey && data.event.shiftKey && data.event.altKey) {
                if (DEV_BUILD && data.event.code === "KeyI") {
                    import("@babylonjs/inspector").then(() => {
                        if (this.scene.debugLayer.isVisible()) {
                            this.scene.debugLayer.hide();
                        } else {
                            this.scene.debugLayer.show();
                        }
                    });
                }

                switch (data.event.code) {
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
    public readonly collisions: Collisions;
    public readonly uiContainer: Container;

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

        const grid = MeshBuilder.CreateGround("grid", { width: 1000, height: 1000 }, this.scene);
        grid.position.y = -1;
        grid.isPickable = false;
        grid.doNotSyncBoundingInfo = true;
        grid.alwaysSelectAsActiveMesh = true;
        grid.material = CreateGridMaterial(this.scene, this.size);
        grid.parent = ground;
    }
}
