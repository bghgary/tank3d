import { Bullets } from "./bullets";
import { BaseTank } from "./tanks/baseTank";
import { FlankGuardTank } from "./tanks/flankGuardTank";
import { PounderTank } from "./tanks/pounderTank";
import { SniperTank } from "./tanks/sniperTank";
import { Tank } from "./tanks/tank";
import { TwinTank } from "./tanks/twinTank";
import { World } from "./world";
import { Sources } from "./sources";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

interface TankConstructor {
    prototype: Tank;
    new(world: World, bullets: Bullets, previousTank?: Tank): Tank;
    CreateNode(sources: Sources): TransformNode;
}

export interface EvolutionNode {
    readonly Tank: TankConstructor;
    readonly children: Array<EvolutionNode>;
}

export const EvolutionRootNode: EvolutionNode = {
    Tank: BaseTank,
    children: [{
        Tank: SniperTank,
        children: []
    }, {
        Tank: TwinTank,
        children: []
    }, {
        Tank: FlankGuardTank,
        children: []
    }, {
        Tank: PounderTank,
        children: []
    }],
};
