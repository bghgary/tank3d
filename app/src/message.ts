import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "./world";

export class Message {
    private _world: World;

    public constructor(world: World) {
        this._world = world;
    }

    public show(text: string, onDone: () => void): void {
        const textBlock = new TextBlock("message", `${text}\nPress enter to respawn.`);
        textBlock.fontSize = 36;
        textBlock.color = "white";
        textBlock.outlineWidth = 4;
        textBlock.outlineColor = "black";
        textBlock.resizeToFit = true;
        this._world.uiTexture.addControl(textBlock);

        this._world.paused = true;
        const observer = this._world.scene.onKeyboardObservable.add((data) => {
            if (data.type === KeyboardEventTypes.KEYDOWN && data.event.code === "Enter") {
                this._world.scene.onKeyboardObservable.remove(observer);
                this._world.uiTexture.removeControl(textBlock);
                this._world.paused = false;
                onDone();
            }
        });
    }
}