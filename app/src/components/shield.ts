import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity, EntityType } from "../entity";
import { World } from "../worlds/world";
import { Weapon } from "./weapon";

export class Shield extends Weapon {
    public constructor(world: World, owner: Entity, node: TransformNode) {
        super(world, EntityType.Shield, owner, node);
    }
}
