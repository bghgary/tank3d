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
        this._node.position.y = (-parent.position.y - 0.999) / parent.scaling.y;
        const scale = parent.position.y / parent.scaling.y * 0.5 + this._size * 2;
        this._node.scaling.x = scale / parent.scaling.x;
        this._node.scaling.y = scale / parent.scaling.y;
        this._node.scaling.z = scale / parent.scaling.z;
    }
}
