import { TransformNode } from "@babylonjs/core";
import { Sources } from "./sources";

export class Shadow {
    private readonly _node: TransformNode;
    private readonly _size: number;

    public constructor(sources: Sources, parent: TransformNode, size: number) {
        this._node = sources.createShadow(parent);
        this._size = size;
        this.update();
    }

    public update(): void {
        const parent = this._node.parent as TransformNode;
        this._node.position.y = -parent.position.y - 0.999;
        this._node.scaling.setAll(parent.position.y * 0.5 + this._size * 2);
    }
}
