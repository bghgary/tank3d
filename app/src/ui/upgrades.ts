import { Observable } from "@babylonjs/core/Misc/observable";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "../world";
import { BarButton } from "./bar";
import { Level } from "./level";
import { Theme } from "./theme";

class UpgradeBarButton extends BarButton {
    public get value() {
        return super.value;
    }

    public set value(value) {
        super.value = value;
        this._text.color = (value < this.maxValue ? "white" : "lime");
    }
}

export const enum UpgradeType {
    BulletSpeed,
    BulletDamage,
    BulletHealth,
    Reload,
    HealthRegen,
    MaxHealth,
    MoveSpeed,
}

export class Upgrades {
    private readonly _root: StackPanel;
    private readonly _barButtons = new Map<UpgradeType, UpgradeBarButton>();
    private readonly _available: TextBlock;
    private _count = 0;

    public constructor(world: World, level: Level) {
        this._root = new StackPanel("upgrades");
        this._root.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._root.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._root.left = 8;
        this._root.top = -8;
        this._root.spacing = 4;
        this._root.adaptWidthToChildren = true;
        world.uiContainer.addControl(this._root);

        const properties = {
            maxValue: 9,
            width: 200,
            height: 24,
            backgroundColor: Theme.BackgroundColor,
            hoverColor: Theme.HoverColor,
            pressColor: Theme.PressColor,
        };

        const entries = new Map([
            [UpgradeType.BulletSpeed,  { name: "bulletSpeed",  displayName: "Bullet Speed",  barColor: "#FF3F3F7F", key: "1" }],
            [UpgradeType.BulletDamage, { name: "bulletDamage", displayName: "Bullet Damage", barColor: "#3FFF3F7F", key: "2" }],
            [UpgradeType.BulletHealth, { name: "bulletHealth", displayName: "Bullet Health", barColor: "#3F3FFF7F", key: "3" }],
            [UpgradeType.Reload,       { name: "reload",       displayName: "Reload",        barColor: "#3FFFFF7F", key: "4" }],
            [UpgradeType.HealthRegen,  { name: "healthRegen",  displayName: "Heath Regen",   barColor: "#FF3FFF7F", key: "5" }],
            [UpgradeType.MaxHealth,    { name: "maxHealth",    displayName: "Max Health",    barColor: "#FFFF3F7F", key: "6" }],
            [UpgradeType.MoveSpeed,    { name: "moveSpeed",    displayName: "Move Speed",    barColor: "#FF8C007F", key: "7" }],
        ]);

        this._available = new TextBlock("available");
        this._available.fontSizeInPixels = properties.height * 0.7;
        this._available.color = "white";
        this._available.shadowBlur = 5;
        this._available.resizeToFit = true;
        this._root.addControl(this._available);

        for (const [key, value] of entries) {
            const barButton = new UpgradeBarButton(value.name, this._root, {
                ...properties,
                barColor: value.barColor,
                keyCode: `Digit${value.key}`,
                keyText: value.key,
            }, world);
            barButton.text = value.displayName;
            barButton.onPressObservable.add(() => {
                this._barButtons.get(key)!.value++;
                this.onUpgradeObservable.notifyObservers(key);
                this._update();
            });
            this._barButtons.set(key, barButton);
        }

        this._update();
        level.onChangedObservable.add((level) => {
            if (level < 20) {
                this._count = level - 1;
            } else if (level < 40) {
                this._count = 20 + Math.floor((level - 20) * 0.5);
            } else {
                this._count = 30 + Math.floor((level - 40) * 0.25);
            }

            this._update();
        });
    }

    public reset(): void {
        for (const barButton of this._barButtons.values()) {
            barButton.value = 0;
        }

        this._update();
    }

    public getUpgradeValue(type: UpgradeType): number {
        return this._barButtons.get(type)!.value;
    }

    public onUpgradeObservable = new Observable<UpgradeType>();

    private _update(): void {
        let used = 0;
        for (const barButton of this._barButtons.values()) {
            used += barButton.value;
        }

        const available = this._count - used;
        if (available > 0) {
            this._available.text = `x${available}`;
            this._root.isEnabled = true;
            this._root.alpha = 1;
        } else {
            this._available.text = "";
            this._root.isEnabled = false;
            this._root.alpha = 0.5;
        }
    }
}