import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "./sources";
import { TankProperties } from "./tank";

const BaseTankProperties = {
    bulletSpeed: 5,
    bulletDamage: 6,
    bulletHealth: 10,
    reloadTime: 0.5,
    healthRegen: 0,
    maxHealth: 100,
    moveSpeed: 5,
};

export interface EvolutionNode {
    readonly createTank: (sources: Sources, name?: string) => TransformNode;
    readonly tankProperties: TankProperties;
    readonly children: Array<EvolutionNode>;
}

export const EvolutionTree: Array<EvolutionNode> = [{
    createTank: (sources, name) => sources.createTank(undefined, name),
    tankProperties: BaseTankProperties,
    children: [{
        createTank: (sources, name) => sources.createSniperTank(undefined, name),
        tankProperties: BaseTankProperties,
        children: []
    }, {
        createTank: (sources, name) => sources.createTwinTank(undefined, name),
        tankProperties: BaseTankProperties,
        children: []
    }, {
        createTank: (sources, name) => sources.createFlankGuardTank(undefined, name),
        tankProperties: BaseTankProperties,
        children: []
    }, {
        createTank: (sources, name) => sources.createPounderTank(undefined, name),
        tankProperties: BaseTankProperties,
        children: []
    }],
}];
