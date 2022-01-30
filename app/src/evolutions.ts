import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "./sources";
import { TankProperties } from "./tank";

function multiply(properties: TankProperties, multiplier: Partial<TankProperties>): TankProperties {
    return {
        bulletSpeed: properties.bulletSpeed * (multiplier.bulletSpeed || 1),
        bulletDamage: properties.bulletDamage * (multiplier.bulletDamage || 1),
        bulletHealth: properties.bulletHealth * (multiplier.bulletHealth || 1),
        reloadTime: properties.reloadTime * (multiplier.reloadTime || 1),
        healthRegen: properties.healthRegen * (multiplier.healthRegen || 1),
        maxHealth: properties.maxHealth * (multiplier.maxHealth || 1),
        moveSpeed: properties.moveSpeed * (multiplier.moveSpeed || 1),
    };
}

const BaseTankProperties = {
    bulletSpeed: 5,
    bulletDamage: 6,
    bulletHealth: 10,
    reloadTime: 0.5,
    healthRegen: 0,
    maxHealth: 100,
    moveSpeed: 5,
};

const SniperTankProperties = multiply(BaseTankProperties, {
    bulletSpeed: 2,
    reloadTime: 2,
});

const TwinTankProperties = BaseTankProperties;

const FlankGuardTankProperties = BaseTankProperties;

const PounderTankProperties = multiply(BaseTankProperties, {
    bulletDamage: 2,
    bulletHealth: 2,
    reloadTime: 2,
});

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
        tankProperties: SniperTankProperties,
        children: []
    }, {
        createTank: (sources, name) => sources.createTwinTank(undefined, name),
        tankProperties: TwinTankProperties,
        children: []
    }, {
        createTank: (sources, name) => sources.createFlankGuardTank(undefined, name),
        tankProperties: FlankGuardTankProperties,
        children: []
    }, {
        createTank: (sources, name) => sources.createPounderTank(undefined, name),
        tankProperties: PounderTankProperties,
        children: []
    }],
}];
