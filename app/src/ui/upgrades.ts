import { Observable } from "@babylonjs/core/Misc/observable";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "../world";
import { BarButton } from "./bar";
import { Level } from "./level";

export const enum UpgradeType {
    BulletSpeed,
    BulletDamage,
    BulletPenetration,
    Reload,
    HealthRegen,
    MaxHealth,
    MoveSpeed,
}

export class Upgrades {
    private readonly _root: StackPanel;
    private readonly _barButtons = new Map<UpgradeType, UpgradeBarButton>();
    private readonly _available: TextBlock;
    private _level = 0;

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
            cornerRadius: 15,
            border: 3,
            backgroundColor: "#1111117F",
        };

        const entries = new Map([
            [UpgradeType.BulletSpeed,       { name: "bulletSpeed",       displayName: "Bullet Speed",       barColor: "#FF3F3F7F" }],
            [UpgradeType.BulletDamage,      { name: "bulletDamage",      displayName: "Bullet Damage",      barColor: "#3FFF3F7F" }],
            [UpgradeType.BulletPenetration, { name: "bulletPenetration", displayName: "Bullet Penetration", barColor: "#3F3FFF7F" }],
            [UpgradeType.Reload,            { name: "reload",            displayName: "Reload",             barColor: "#3FFFFF7F" }],
            [UpgradeType.HealthRegen,       { name: "healthRegen",       displayName: "Heath Regen",        barColor: "#FF3FFF7F" }],
            [UpgradeType.MaxHealth,         { name: "maxHealth",         displayName: "Max Health",         barColor: "#FFFF3F7F" }],
            [UpgradeType.MoveSpeed,         { name: "moveSpeed",         displayName: "Move Speed",         barColor: "#FF8C007F" }],
        ]);

        this._available = new TextBlock("available");
        this._available.fontSize = properties.height * 0.7;
        this._available.color = "white";
        this._available.shadowBlur = 5;
        this._available.resizeToFit = true;
        this._root.addControl(this._available);

        for (const [key, value] of entries) {
            const barButton = new UpgradeBarButton(value.name, this._root, { ...properties, barColor: value.barColor });
            barButton.text = value.displayName;
            barButton.onPointerClickObservable.add(() => {
                this._barButtons.get(key)!.value++;
                this.onUpgradeObservable.notifyObservers(key);
                this._update();
            });
            this._barButtons.set(key, barButton);
        }

        this._update();
        level.onChangedObservable.add((level) => {
            this._level = level;
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

        const available = this._level - used;
        if (available > 0) {
            this._root.alpha = 1;
            this._root.isEnabled = true;
            this._available.text = `x${available}`;
        } else {
            this._root.alpha = 0.5;
            this._root.isEnabled = false;
            this._available.text = "";
        }
    }
}

class UpgradeBarButton extends BarButton {
    public get value() {
        return super.value;
    }

    public set value(value) {
        super.value = value;
        this._text.color = (value < this.maxValue ? "white" : "lime");
    }
}