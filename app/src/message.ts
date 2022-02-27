import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "./worlds/world";

export class Message {
    private _world: World;

    public constructor(world: World) {
        this._world = world;
    }

    public show(text: string, onDone: () => void): void {
        const textBlock = new TextBlock("message", `${text}\nPress enter to respawn.`);
        textBlock.fontSizeInPixels = 36;
        textBlock.color = "white";
        textBlock.shadowBlur = 5;
        this._world.uiContainer.addControl(textBlock);

        this._world.paused = true;
        const observer = this._world.scene.onKeyboardObservable.add((data) => {
            if (data.type === KeyboardEventTypes.KEYDOWN && data.event.code === "Enter") {
                this._world.scene.onKeyboardObservable.remove(observer);
                this._world.uiContainer.removeControl(textBlock);
                this._world.paused = false;
                onDone();
            }
        });
    }
}