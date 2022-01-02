export const ShadowNodeMaterial = {
  "tags": null,
  "ignoreAlpha": false,
  "maxSimultaneousLights": 4,
  "mode": 0,
  "id": "node",
  "name": "node",
  "checkReadyOnEveryCall": false,
  "checkReadyOnlyOnce": false,
  "state": "",
  "alpha": 1,
  "backFaceCulling": true,
  "cullBackFaces": true,
  "sideOrientation": 1,
  "alphaMode": 2,
  "_needDepthPrePass": false,
  "disableDepthWrite": false,
  "disableColorWrite": false,
  "forceDepthWrite": false,
  "depthFunction": 0,
  "separateCullingPass": false,
  "fogEnabled": true,
  "pointSize": 1,
  "zOffset": 0,
  "zOffsetUnits": 0,
  "pointsCloud": false,
  "fillMode": 0,
  "customType": "BABYLON.NodeMaterial",
  "outputNodes": [
    7092,
    7103
  ],
  "blocks": [
    {
      "customType": "BABYLON.VertexOutputBlock",
      "id": 7092,
      "name": "VertexOutput",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [
        {
          "name": "vector",
          "inputName": "vector",
          "targetBlockId": 7093,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": []
    },
    {
      "customType": "BABYLON.TransformBlock",
      "id": 7093,
      "name": "WorldPos * ViewProjectionTransform",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [
        {
          "name": "vector",
          "inputName": "vector",
          "targetBlockId": 7094,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "transform",
          "inputName": "transform",
          "targetBlockId": 7102,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        },
        {
          "name": "xyz"
        }
      ],
      "complementZ": 0,
      "complementW": 1
    },
    {
      "customType": "BABYLON.TransformBlock",
      "id": 7094,
      "name": "WorldPos",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [
        {
          "name": "vector",
          "inputName": "vector",
          "targetBlockId": 7095,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "transform",
          "inputName": "transform",
          "targetBlockId": 7096,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        },
        {
          "name": "xyz"
        }
      ],
      "complementZ": 0,
      "complementW": 1
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7095,
      "name": "position",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 8,
      "mode": 1,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false
    },
    {
      "customType": "BABYLON.InstancesBlock",
      "id": 7096,
      "name": "Instances",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [
        {
          "name": "world0",
          "inputName": "world0",
          "targetBlockId": 7097,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "world1",
          "inputName": "world1",
          "targetBlockId": 7098,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "world2",
          "inputName": "world2",
          "targetBlockId": 7099,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "world3",
          "inputName": "world3",
          "targetBlockId": 7100,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "world",
          "inputName": "world",
          "targetBlockId": 7101,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        },
        {
          "name": "instanceID"
        }
      ]
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7097,
      "name": "world0",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 16,
      "mode": 1,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7098,
      "name": "world1",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 16,
      "mode": 1,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7099,
      "name": "world2",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 16,
      "mode": 1,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7100,
      "name": "world3",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 16,
      "mode": 1,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7101,
      "name": "world",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 128,
      "mode": 0,
      "systemValue": 1,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7102,
      "name": "ViewProjection",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 128,
      "mode": 0,
      "systemValue": 4,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false
    },
    {
      "customType": "BABYLON.FragmentOutputBlock",
      "id": 7103,
      "name": "FragmentOutput",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 2,
      "inputs": [
        {
          "name": "rgba"
        },
        {
          "name": "rgb",
          "inputName": "rgb",
          "targetBlockId": 7104,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "a",
          "inputName": "a",
          "targetBlockId": 10354,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [],
      "convertToGammaSpace": false,
      "convertToLinearSpace": false,
      "useLogarithmicDepth": false
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7104,
      "name": "Color3",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 32,
      "mode": 0,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false,
      "valueType": "BABYLON.Color3",
      "value": [
        0,
        0,
        0
      ]
    },
    {
      "customType": "BABYLON.MultiplyBlock",
      "id": 10354,
      "name": "Multiply",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 4,
      "inputs": [
        {
          "name": "left",
          "inputName": "left",
          "targetBlockId": 7106,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "right",
          "inputName": "right",
          "targetBlockId": 10378,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        }
      ]
    },
    {
      "customType": "BABYLON.TrigonometryBlock",
      "id": 7106,
      "name": "Exp",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 4,
      "inputs": [
        {
          "name": "input",
          "inputName": "input",
          "targetBlockId": 7107,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "operation": 3
    },
    {
      "customType": "BABYLON.MultiplyBlock",
      "id": 7107,
      "name": "Multiply",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 4,
      "inputs": [
        {
          "name": "left",
          "inputName": "left",
          "targetBlockId": 7108,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "right",
          "inputName": "right",
          "targetBlockId": 7113,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        }
      ]
    },
    {
      "customType": "BABYLON.PowBlock",
      "id": 7108,
      "name": "Pow",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 4,
      "inputs": [
        {
          "name": "value",
          "inputName": "value",
          "targetBlockId": 7109,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "power",
          "inputName": "power",
          "targetBlockId": 7112,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        }
      ]
    },
    {
      "customType": "BABYLON.MultiplyBlock",
      "id": 7109,
      "name": "Multiply",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 4,
      "inputs": [
        {
          "name": "left",
          "inputName": "left",
          "targetBlockId": 7110,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        },
        {
          "name": "right",
          "inputName": "right",
          "targetBlockId": 7111,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        }
      ]
    },
    {
      "customType": "BABYLON.LengthBlock",
      "id": 7110,
      "name": "Length",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 4,
      "inputs": [
        {
          "name": "value",
          "inputName": "value",
          "targetBlockId": 7095,
          "targetConnectionName": "output",
          "isExposedOnFrame": true,
          "exposedPortPosition": -1
        }
      ],
      "outputs": [
        {
          "name": "output"
        }
      ]
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7111,
      "name": "Size",
      "comments": "",
      "visibleInInspector": true,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 1,
      "mode": 0,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false,
      "valueType": "number",
      "value": 2
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7112,
      "name": "Constant",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 1,
      "mode": 0,
      "systemValue": null,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": true,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false,
      "valueType": "number",
      "value": 4
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 7113,
      "name": "Constant",
      "comments": "",
      "visibleInInspector": false,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 1,
      "mode": 0,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": true,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false,
      "valueType": "number",
      "value": -10
    },
    {
      "customType": "BABYLON.InputBlock",
      "id": 10378,
      "name": "Darkness",
      "comments": "",
      "visibleInInspector": true,
      "visibleOnFrame": false,
      "target": 1,
      "inputs": [],
      "outputs": [
        {
          "name": "output"
        }
      ],
      "type": 1,
      "mode": 0,
      "systemValue": null,
      "animationType": 0,
      "min": 0,
      "max": 0,
      "isBoolean": false,
      "matrixMode": 0,
      "isConstant": false,
      "groupInInspector": "",
      "convertToGammaSpace": false,
      "convertToLinearSpace": false,
      "valueType": "number",
      "value": 0.25
    }
  ]
};