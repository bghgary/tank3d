import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Nullable } from "@babylonjs/core/types";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { EvolutionNode, EvolutionRootNode } from "../evolutions";
import { DisplayNameMetadata } from "../metadata";
import { captureScreenshotAsync } from "../screenshot";
import { World } from "../worlds/world";
import { ImageButton } from "./image";
import { Level } from "./level";
import { Theme } from "./theme";

const BUTTON_SIZE = 100;
const MAX_BUTTONS_PER_ROW = 3;

type Cache = Map<EvolutionNode, {
    displayName: string;
    imageUrl: string;
}>;

export class Evolutions {
    private readonly _world: World;
    private readonly _level: Level;
    private readonly _cachePromise: Promise<Cache>;
    private _root: Nullable<StackPanel> = null;
    private _evolutionNode: EvolutionNode;
    private _evolutionDepth: number;

    public constructor(world: World, level: Level) {
        this._world = world;
        this._level = level;

        this._cachePromise = this._world.scene.whenReadyAsync().then(() => {
            return this._initCacheAsync(new Map(), EvolutionRootNode);
        });

        this._evolutionNode = EvolutionRootNode;
        this._evolutionDepth = 0;

        this._level.onChangedObservable.add(() => {
            this._update();
        });
    }

    public reset(): void {
        if (this._root) {
            this._root.dispose();
            this._root = null;
        }

        this._evolutionNode = EvolutionRootNode;
        this._evolutionDepth = 0;
        this._update();
    }

    private _update(): void {
        if (!this._root && this._evolutionDepth < Math.floor(this._level.value / 20)) {
            this._show();
        }
    }

    private async _show(): Promise<void> {
        if (this._root) {
            return;
        }

        this._root = new StackPanel("evolutions");
        this._root.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._root.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._root.left = 8;
        this._root.top = 8;
        this._root.adaptWidthToChildren = true;
        this._root.spacing = 4;
        this._world.uiContainer.addControl(this._root);

        const cache = await this._cachePromise;

        let row: Nullable<StackPanel> = null;
        for (let index = 0; index < this._evolutionNode.children.length; ++index) {
            const child = this._evolutionNode.children[index]!;
            if (!row || row.children.length === MAX_BUTTONS_PER_ROW) {
                row = new StackPanel("row");
                row.isVertical = false;
                row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                row.adaptHeightToChildren = true;
                row.spacing = 4;
                this._root.addControl(row);
            }

            const entry = cache.get(child)!;
            const screenshotButton = new ImageButton(`button`, row, entry.imageUrl, {
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                backgroundColor: Theme.BackgroundColor,
                pressColor: Theme.PressColor,
                hoverColor: Theme.HoverColor,
                label: entry.displayName,
                keyInfo: { shift: true, code: `Digit${index + 1}` },
                keyText: `[Shift+${index + 1}]`,
            }, this._world);

            screenshotButton.onClickObservable.add(() => {
                ++this._evolutionDepth;
                this._evolutionNode = child;
                this.onEvolveObservable.notifyObservers(this._evolutionNode);
                this._hide();
                this._update();
            });
        }
    }

    private _hide(): void {
        if (!this._root) {
            return;
        }

        this._root.dispose();
        this._root = null;
    }

    private async _initCacheAsync(cache: Cache, evolutionNode: EvolutionNode): Promise<Cache> {
        for (const child of evolutionNode.children) {
            const tank = child.Tank.Create(this._world.sources);
            Quaternion.RotationYawPitchRollToRef(Math.PI * 0.6, 0, 0, tank.rotationQuaternion!);
            const size = BUTTON_SIZE * 2;
            cache.set(child, {
                displayName: (tank.metadata as DisplayNameMetadata).displayName,
                imageUrl: await captureScreenshotAsync(tank, size, size)
            });
            tank.dispose();
            await this._initCacheAsync(cache, child);
        }

        return cache;
    }

    public readonly onEvolveObservable = new Observable<EvolutionNode>();
}
