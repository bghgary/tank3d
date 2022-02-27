import { KeyboardEventTypes, KeyboardInfo } from "@babylonjs/core/Events/keyboardEvents";
import { Observer } from "@babylonjs/core/Misc/observable";
import { Nullable } from "@babylonjs/core/types";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { World } from "../worlds/world";

export function isHierarchyEnabled(control: Control): boolean {
    for (let current: Nullable<Control> = control; current != null; current = current.parent) {
        if (!current.isEnabled) {
            return false;
        }
    }

    return true;
}

export interface KeyInfo {
    code: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
}

export function registerKeyboard(world: World, keyInfo: KeyInfo, onDown?: () => void, onUp?: () => void): Nullable<Observer<KeyboardInfo>> {
    return world.scene.onKeyboardObservable.add((data) => {
        if (world.paused) {
            return;
        }

        if (data.event.ctrlKey === !!keyInfo.ctrl &&
            data.event.shiftKey === !!keyInfo.shift &&
            data.event.altKey === !!keyInfo.alt &&
            data.event.code === keyInfo.code) {
            if (data.type === KeyboardEventTypes.KEYDOWN) {
                if (onDown) {
                    onDown();
                }
            } else {
                if (onUp) {
                    onUp();
                }
            }
        }
    });
}