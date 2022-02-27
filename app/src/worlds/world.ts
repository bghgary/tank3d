import { Collisions } from "../collisions";
import { Sources } from "../sources";
import { Bullets } from "../bullets";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { Observable } from "@babylonjs/core/Misc/observable";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Control, TextBlock } from "@babylonjs/gui";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Entity } from "../entity";
import { CreateGridMaterial } from "../materials/gridMaterial";

declare const VERSION: string;
declare const DEV_BUILD: boolean;

function now(): number {
    return performance.now() * 0.001;
}

export abstract class World {
    private _previousTime = 0;
    private _suspended = false;
    private _paused = false;

    protected constructor(engine: Engine, size: number) {
        this.size = size;
        this.scene = new Scene(engine);
        this.sources = new Sources(this);
        this.collisions = new Collisions(this);
        this.bullets = new Bullets(this);
        this.uiContainer = AdvancedDynamicTexture.CreateFullscreenUI("Fullscreen").rootContainer;

        const ground = this._createGround();

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
            if (data.type === KeyboardEventTypes.KEYUP && data.event.ctrlKey && data.event.shiftKey && data.event.altKey) {
                if (DEV_BUILD && data.event.code === "KeyI") {
                    import("@babylonjs/inspector").then(() => {
                        if (this.scene.debugLayer.isVisible()) {
                            this.scene.debugLayer.hide();
                        } else {
                            this.scene.debugLayer.show();
                        }
                    });
                }
            }

            if (data.type === KeyboardEventTypes.KEYUP && data.event.code === "Escape") {
                this.paused = !this.paused;
            }
        });

        this.scene.pointerDownPredicate = () => false;
        this.scene.pointerUpPredicate = () => false;
        this.scene.pointerMovePredicate = () => false;

        let pointerOffsetX = 0;
        let pointerOffsetY = 0;
        this.scene.onPointerObservable.add((data) => {
            pointerOffsetX = data.event.offsetX;
            pointerOffsetY = data.event.offsetY;
        });

        this._previousTime = now();

        const renderLoop = () => {
            const currentTime = now();
            const deltaTime = Math.min(currentTime - this._previousTime);
            this._previousTime = currentTime;

            if (!this._suspended && !this._paused) {
                const pickInfo = this.scene.pick(pointerOffsetX, pointerOffsetY, (mesh) => mesh === ground);
                if (pickInfo && pickInfo.pickedPoint) {
                    this.pointerPosition.copyFrom(pickInfo.pickedPoint);
                }

                this.bullets.update(deltaTime);
                this._update(deltaTime);
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
    public readonly bullets: Bullets;
    public readonly uiContainer: Container;
    public readonly pointerPosition = new Vector3();

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

    public readonly onPausedStateChangedObservable = new Observable<boolean>();

    public readonly onEnemyDestroyedObservable = new Observable<[Entity, Entity & { points: number }]>();

    protected abstract _update(deltaTime: number): void;

    private _createGround(): Mesh {
        const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, this.scene);
        ground.visibility = 0;

        const grid = MeshBuilder.CreateGround("grid", { width: 1000, height: 1000 }, this.scene);
        grid.position.y = -1;
        grid.doNotSyncBoundingInfo = true;
        grid.alwaysSelectAsActiveMesh = true;
        grid.material = CreateGridMaterial(this.scene, this.size);
        grid.parent = ground;

        return ground;
    }
}
