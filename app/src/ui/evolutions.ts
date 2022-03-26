import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Nullable } from "@babylonjs/core/types";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { EvolutionNode, EvolutionRootNode } from "../evolutions";
import { captureScreenshotAsync } from "../screenshot";
import { World } from "../worlds/world";
import { ImageButton } from "./image";
import { Level } from "./level";
import { Theme } from "./theme";

const BUTTON_SIZE = 100;
const MAX_BUTTONS_PER_ROW = 3;

export class Evolutions {
    private readonly _world: World;
    private readonly _level: Level;
    private readonly _screenshotCache = new Map<EvolutionNode, Promise<string>>();
    private _root: Nullable<StackPanel> = null;
    private _evolutionNode: EvolutionNode;
    private _evolutionDepth: number;

    public constructor(world: World, level: Level) {
        this._world = world;
        this._level = level;

        this._initScreenshotCache(EvolutionRootNode);

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

    private _show(): void {
        if (this._root) {
            return;
        }

        const promises = new Array<Promise<string>>();
        for (const evolutionNode of this._evolutionNode.children) {
            promises.push(this._screenshotCache.get(evolutionNode)!);
        }

        Promise.all(promises).then((urls) => {
            this._root = new StackPanel("evolutions");
            this._root.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            this._root.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            this._root.left = 8;
            this._root.top = 8;
            this._root.adaptWidthToChildren = true;
            this._root.spacing = 4;
            this._world.uiContainer.addControl(this._root);

            let row: Nullable<StackPanel> = null;
            for (let index = 0; index < this._evolutionNode.children.length; ++index) {
                const evolutionNode = this._evolutionNode.children[index]!;

                if (!row || row.children.length === MAX_BUTTONS_PER_ROW) {
                    row = new StackPanel("row");
                    row.isVertical = false;
                    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                    row.adaptHeightToChildren = true;
                    row.spacing = 4;
                    this._root.addControl(row);
                }

                const screenshotButton = new ImageButton(`button`, row, urls[index]!, {
                    width: BUTTON_SIZE,
                    height: BUTTON_SIZE,
                    backgroundColor: Theme.BackgroundColor,
                    pressColor: Theme.PressColor,
                    hoverColor: Theme.HoverColor,
                    keyInfo: { shift: true, code: `Digit${index + 1}` },
                    keyText: `${index + 1}`,
                }, this._world);

                screenshotButton.onClickObservable.add(() => {
                    ++this._evolutionDepth;
                    this._evolutionNode = evolutionNode;
                    this.onEvolveObservable.notifyObservers(this._evolutionNode);
                    this._hide();
                    this._update();
                });
            }
        });
    }

    private _hide(): void {
        if (!this._root) {
            return;
        }

        this._root.dispose();
        this._root = null;
    }

    private _initScreenshotCache(evolutionNode: EvolutionNode): void {
        const tank = evolutionNode.Tank.CreateMesh(this._world.sources);
        Quaternion.RotationYawPitchRollToRef(Math.PI * 0.6, 0, 0, tank.rotationQuaternion!);

        const size = BUTTON_SIZE * 2;
        this._screenshotCache.set(evolutionNode, captureScreenshotAsync(tank, size, size).then((url) => {
            tank.dispose();
            return url;
        }));

        for (const child of evolutionNode.children) {
            this._initScreenshotCache(child);
        }
    }

    public readonly onEvolveObservable = new Observable<EvolutionNode>();
}
