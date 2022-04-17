import { Observable } from "@babylonjs/core/Misc/observable";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "../worlds/world";
import { BarButton } from "./bar";
import { Level } from "./level";
import { Theme } from "./theme";

const MAX_UPGRADE_VALUE = 9;

class UpgradeBarButton extends BarButton {
    public override get value() {
        return super.value;
    }

    public override set value(value) {
        super.value = value;
        this._text.color = (value < this.maxValue ? "white" : "lime");
    }
}

export const enum UpgradeType {
    WeaponSpeed,
    WeaponDamage,
    WeaponHealth,
    ReloadTime,
    HealthRegen,
    MaxHealth,
    MoveSpeed,
    BodyDamage,
}

export function getUpgradeNames(weaponName: string, speedName = "Speed", reloadName = "Reload"): Map<UpgradeType, string> {
    return new Map([
        [UpgradeType.WeaponSpeed,  `${weaponName} ${speedName}`],
        [UpgradeType.WeaponDamage, `${weaponName} Damage`      ],
        [UpgradeType.WeaponHealth, `${weaponName} Health`      ],
        [UpgradeType.ReloadTime,   reloadName                  ],
        [UpgradeType.HealthRegen,  "Health Regen"              ],
        [UpgradeType.MaxHealth,    "Max Health"                ],
        [UpgradeType.MoveSpeed,    "Move Speed"                ],
        [UpgradeType.BodyDamage,   "Body Damage"               ],
    ]);
}

export class Upgrades {
    private readonly _level: Level;
    private readonly _root: StackPanel;
    private readonly _barButtons = new Map<UpgradeType, UpgradeBarButton>();
    private readonly _available: TextBlock;

    private _names: Map<UpgradeType, string>;

    public constructor(world: World, level: Level, names: Map<UpgradeType, string>) {
        this._level = level;
        this._names = names;

        this._root = new StackPanel("upgrades");
        this._root.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._root.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._root.left = 8;
        this._root.top = -8;
        this._root.spacing = 4;
        this._root.adaptWidthToChildren = true;
        world.uiContainer.addControl(this._root);

        const properties = {
            maxValue: MAX_UPGRADE_VALUE,
            width: 200,
            height: 24,
            backgroundColor: Theme.BackgroundColor,
            hoverColor: Theme.HoverColor,
            pressColor: Theme.PressColor,
        };

        const entries = new Map([
            [UpgradeType.WeaponSpeed,  { name: "weaponSpeed",  barColor: "#FF3F3F7F", key: "1" }],
            [UpgradeType.WeaponDamage, { name: "weaponDamage", barColor: "#3FFF3F7F", key: "2" }],
            [UpgradeType.WeaponHealth, { name: "weaponHealth", barColor: "#3F3FFF7F", key: "3" }],
            [UpgradeType.ReloadTime,   { name: "reloadTime",   barColor: "#3FFFFF7F", key: "4" }],
            [UpgradeType.HealthRegen,  { name: "healthRegen",  barColor: "#FF3FFF7F", key: "5" }],
            [UpgradeType.MaxHealth,    { name: "maxHealth",    barColor: "#FFFF3F7F", key: "6" }],
            [UpgradeType.MoveSpeed,    { name: "moveSpeed",    barColor: "#FF8C007F", key: "7" }],
            [UpgradeType.BodyDamage,   { name: "bodyDamage",   barColor: "#8C008C7F", key: "8" }],
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
                keyInfo: { code: `Digit${value.key}` },
                keyText: value.key,
            }, world);
            barButton.onClickObservable.add(() => {
                this._barButtons.get(key)!.value++;
                this.onUpgradeObservable.notifyObservers(key);
                this._update();
            });
            this._barButtons.set(key, barButton);
        }

        this._update();
        this._level.onChangedObservable.add(() => this._update());
    }

    public setNames(names: Map<UpgradeType, string>): void {
        this._names = names;
        this._update();
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

    public readonly onUpgradeObservable = new Observable<UpgradeType>();

    private _update(): void {
        const level = this._level.value;
        const total =
            (level < 20) ? level - 1 :
            (level < 40) ? 20 + Math.floor((level - 20) * 0.5) :
            30 + Math.floor((level - 40) * 0.25);

        let used = 0;
        for (const barButton of this._barButtons.values()) {
            used += barButton.value;
        }

        const available = total - used;
        if (available > 0) {
            this._available.text = `x${available}`;
            this._root.isEnabled = true;
            this._root.alpha = 1;
        } else {
            this._available.text = "";
            this._root.isEnabled = false;
            this._root.alpha = 0.5;
        }

        for (const [type, name] of this._names) {
            this._barButtons.get(type)!.text = name;
        }
        // const weaponName = WeaponName.get(this._weaponType) || "Weapon";
        // const weaponSpeedName = WeaponSpeedName.get(this._weaponType) || "Speed";
        // this._barButtons.get(UpgradeType.WeaponSpeed)!.text = `${weaponName} ${weaponSpeedName}`;
        // this._barButtons.get(UpgradeType.WeaponDamage)!.text = `${weaponName} Damage`;
        // this._barButtons.get(UpgradeType.WeaponHealth)!.text = `${weaponName} Health`;
    }
}