import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SizeMetadata } from "../metadata";
import { Sources } from "../sources";

export class Shadow {
    private readonly _node: TransformNode;
    private _size: number;

    public constructor(sources: Sources, parent: TransformNode) {
        this._node = sources.createShadow(parent);
        this._size = (parent.metadata as SizeMetadata)?.size || 1;
        this.update();
    }

    public setParent(parent: TransformNode): void {
        this._node.parent = parent;
        this._size = (parent.metadata as SizeMetadata).size;
    }

    public update(): void {
        const parent = this._node.parent as TransformNode;
        this._node.position.y = (-parent.position.y - 1) / parent.scaling.y;
        this._node.scaling.setAll(parent.position.y / parent.scaling.y * 0.25 + this._size);
    }
}
