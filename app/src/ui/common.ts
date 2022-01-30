import { Nullable } from "@babylonjs/core/types";
import { Control } from "@babylonjs/gui/2D/controls/control";

export function isHierarchyEnabled(control: Control): boolean {
    for (let current: Nullable<Control> = control; current != null; current = current.parent) {
        if (!current.isEnabled) {
            return false;
        }
    }

    return true;
}