import { Observable } from "@babylonjs/core/Misc/observable";
import { Nullable } from "@babylonjs/core/types";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { EvolutionNode, EvolutionTree } from "../evolutions";
import { World } from "../world";
import { ScreenshotButton } from "./screenshotButton";
import { Theme } from "./theme";

const MAX_BUTTONS_PER_ROW = 3;

export class Evolutions {
    private readonly _root: StackPanel;

    public constructor(world: World) {
        this._root = new StackPanel("evolutions");
        this._root.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._root.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this._root.left = 8;
        this._root.top = 8;
        this._root.adaptWidthToChildren = true;
        this._root.spacing = 4;
        world.uiContainer.addControl(this._root);

        let row: Nullable<StackPanel> = null;
        let count = 0;
        for (const evolutionNode of EvolutionTree[0].children) {
            if (!row || row.children.length === MAX_BUTTONS_PER_ROW) {
                row = new StackPanel("row");
                row.isVertical = false;
                row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                row.adaptHeightToChildren = true;
                row.spacing = 4;
                this._root.addControl(row);
            }

            ++count;

            const tank = evolutionNode.createTank(world.sources);

            const screenshotButton = new ScreenshotButton(`button`, row, tank, {
                width: 100,
                height: 100,
                backgroundColor: Theme.BackgroundColor,
                pressColor: Theme.PressColor,
                hoverColor: Theme.HoverColor,
                keyInfo: { shift: true, code: `Digit${count}` },
                keyText: `${count}`,
            }, world);

            screenshotButton.onClickObservable.add(() => {
                this.onEvolveObservable.notifyObservers(evolutionNode);
            });
        }
    }

    public onEvolveObservable = new Observable<EvolutionNode>();
}
