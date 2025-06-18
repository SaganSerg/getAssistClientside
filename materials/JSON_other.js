const JSON_other = 

{
  "trailers": [ // vehicles -- vehicle_tractor_or_trailer
    {
      "axles": [
        {
          "circuitId": "8e6dccad-7dae-4231-9ca5-3d33bf8432d9",
          "id": "fd4d4c08-4fdb-4c2b-a9c2-09d69bf92789",
          "num": 1
        },
        {
          "circuitId": "8e6dccad-7dae-4231-9ca5-3d33bf8432d9",
          "id": "307c2336-2caa-4baf-a586-850aeaacd55e",
          "num": 2
        }
      ],
      "circuits": [
        {
          "alsId": "FE:02:FF:28:11:AA",
          "id": "8e6dccad-7dae-4231-9ca5-3d33bf8432d9",
          "num": 1,
          "suspension": "AIR",
          "vehicleId": "8b28eeeb-5097-4d6b-8aa3-769df15369e7"
        }
      ],
      "gaParams": [
        {
          "id": "00697ec1-4274-418c-95b0-dfd6abdfe96d",
          "vehicleId": "8b28eeeb-5097-4d6b-8aa3-769df15369e7",
          "type": "GET_PRESSURE_PARAM",
          "gaParamsJson": {
            "baseParam": {
              "critically": {
                "pressure": 500,
                "temperature": 20
              },
              "insignificantly": {
                "pressure": 50,
                "temperature": 2
              },
              "workRange": {
                "pressure": {
                  "max": 3.0,
                  "min": 2.0
                },
                "temperature": {
                  "max": 40.0,
                  "min": -20.0
                }
              }
            },
            "id": "00697ec1-4274-418c-95b0-dfd6abdfe96d"
          }
        },
        {
          "id": "91d20ad6-a293-467e-88fb-4f5cf7d623fc",
          "vehicleId": "8b28eeeb-5097-4d6b-8aa3-769df15369e7",
          "type": "GET_LOAD_PARAM",
          "gaParamsJson": {
            "axleParams": {
              "fd4d4c08-4fdb-4c2b-a9c2-09d69bf92789": {
                "empty": 3000,
                "loaded": 5500
              },
              "307c2336-2caa-4baf-a586-850aeaacd55e": {
                "empty": 3000,
                "loaded": 5500
              }
            },
            "cargoWeightCalibrated": 0,
            "circuitParams": {
              "8e6dccad-7dae-4231-9ca5-3d33bf8432d9": {
                "empty": 1822,
                "loaded": 2838
              }
            },
            "loadShiftFactor": 0.0,
            "maxCargoWeight": 0,
            "id": "91d20ad6-a293-467e-88fb-4f5cf7d623fc"
          }
        }
      ],
      "sensors": [
        {
          "deviceType": "AL_SENSOR",
          "idSensor": "00000028",
          "mac": "FE:02:FF:28:11:AA",
          "name": "ALS_40",
          "role": "SLAVE",
          "vehicleId": "8b28eeeb-5097-4d6b-8aa3-769df15369e7"
        }
      ],
      "vehicle": {
        "description": "",
        "id": "8b28eeeb-5097-4d6b-8aa3-769df15369e7",
        "name": "",
        "num": "",
        "type": "SEMI_TRAILER",
        "vehicleId": "bd78246b-9700-4057-b38e-edd8733dd68c"
      },
      "wheels": [
        {
          "axleId": "fd4d4c08-4fdb-4c2b-a9c2-09d69bf92789",
          "id": "3f9035be-dba8-46fc-b949-5ec6d2e67048",
          "position": "LEFT_FRONT",
          "tpmId": ""
        },
        {
          "axleId": "fd4d4c08-4fdb-4c2b-a9c2-09d69bf92789",
          "id": "fab305cd-3cd8-4481-8e3d-9a20911f8dc2",
          "position": "LEFT_REAR",
          "tpmId": ""
        },
        {
          "axleId": "fd4d4c08-4fdb-4c2b-a9c2-09d69bf92789",
          "id": "b0694618-3bd4-49e5-a04e-aadf8932afe4",
          "position": "RIGHT_REAR",
          "tpmId": ""
        },
        {
          "axleId": "fd4d4c08-4fdb-4c2b-a9c2-09d69bf92789",
          "id": "8cba027d-af92-41a5-b48a-c1c8f4436e14",
          "position": "RIGHT_FRONT",
          "tpmId": ""
        },
        {
          "axleId": "307c2336-2caa-4baf-a586-850aeaacd55e",
          "id": "2e4f5d16-9754-4df5-b8a7-186eaa016458",
          "position": "LEFT_FRONT",
          "tpmId": ""
        },
        {
          "axleId": "307c2336-2caa-4baf-a586-850aeaacd55e",
          "id": "b4e56415-0344-4316-a1db-947950ed8be8",
          "position": "LEFT_REAR",
          "tpmId": ""
        },
        {
          "axleId": "307c2336-2caa-4baf-a586-850aeaacd55e",
          "id": "57ca621f-77a1-4a32-a1b4-0fb0c7e02cab",
          "position": "RIGHT_REAR",
          "tpmId": ""
        },
        {
          "axleId": "307c2336-2caa-4baf-a586-850aeaacd55e",
          "id": "8e6c3b8a-477f-436f-b1e8-8d7983861c8f",
          "position": "RIGHT_FRONT",
          "tpmId": ""
        }
      ]
    }
  ],
  "vehicleConfig": { // vehicles -- vehicle_tractor_or_trailer
    "axles": [
      {
        "circuitId": "b787cbda-555f-4ae0-8949-37c7f1f7cd1e",
        "id": "69239d26-9af1-4ad6-b17a-e6d971ffcd37",
        "num": 1
      },
      {
        "circuitId": "4667a015-9afd-4b69-95bc-cba0f56cb91c",
        "id": "e252bf7e-6867-4eab-bec1-e4dbad3eb6dd",
        "num": 2
      }
    ],
    "circuits": [
      {
        "alsId": "FE:02:FF:25:11:AA",
        "id": "b787cbda-555f-4ae0-8949-37c7f1f7cd1e",
        "num": 1,
        "suspension": "SPRING",
        "vehicleId": "bd78246b-9700-4057-b38e-edd8733dd68c"
      },
      {
        "alsId": "FE:02:FF:25:11:AA",
        "id": "4667a015-9afd-4b69-95bc-cba0f56cb91c",
        "num": 2,
        "suspension": "AIR",
        "vehicleId": "bd78246b-9700-4057-b38e-edd8733dd68c"
      }
    ],
    "gaParams": [
      {
        "id": "4e535296-4fff-466e-b549-e9dc9b343423",
        "vehicleId": "bd78246b-9700-4057-b38e-edd8733dd68c",
        "type": "GET_LOAD_PARAM",
        "gaParamsJson": {
          "axleParams": {
            "69239d26-9af1-4ad6-b17a-e6d971ffcd37": {
              "empty": 4500,
              "loaded": 5500
            },
            "e252bf7e-6867-4eab-bec1-e4dbad3eb6dd": {
              "empty": 2500,
              "loaded": 6500
            }
          },
          "cargoWeightCalibrated": 10000,
          "circuitParams": {
            "b787cbda-555f-4ae0-8949-37c7f1f7cd1e": {
              "empty": 1802,
              "loaded": 2818
            },
            "4667a015-9afd-4b69-95bc-cba0f56cb91c": {
              "empty": 1802,
              "loaded": 2818
            }
          },
          "loadShiftFactor": 0.0,
          "maxCargoWeight": 20000,
          "id": "4e535296-4fff-466e-b549-e9dc9b343423"
        }
      }
    ],
    "sensors": [
      {
        "deviceType": "AL_SENSOR",
        "idSensor": "00000025",
        "mac": "FE:02:FF:25:11:AA",
        "name": "ALS_37",
        "role": "MASTER",
        "vehicleId": "bd78246b-9700-4057-b38e-edd8733dd68c"
      }
    ],
    "vehicle": {
      "description": "",
      "id": "bd78246b-9700-4057-b38e-edd8733dd68c",
      "name": "",
      "num": "",
      "type": "TRUCK"
    },
    "wheels": [
      {
        "axleId": "69239d26-9af1-4ad6-b17a-e6d971ffcd37",
        "id": "85b741df-6bf4-45d7-803b-59f35f69ff33",
        "position": "LEFT_FRONT",
        "tpmId": ""
      },
      {
        "axleId": "69239d26-9af1-4ad6-b17a-e6d971ffcd37",
        "id": "85c6780a-bcfb-4f65-ba59-1a99fc8f9b91",
        "position": "RIGHT_FRONT",
        "tpmId": ""
      },
      {
        "axleId": "e252bf7e-6867-4eab-bec1-e4dbad3eb6dd",
        "id": "c2d7a6b8-2086-4dbf-a611-4fbd8166fdb2",
        "position": "LEFT_FRONT",
        "tpmId": ""
      },
      {
        "axleId": "e252bf7e-6867-4eab-bec1-e4dbad3eb6dd",
        "id": "282184ee-8866-41aa-8a24-c328b6a3bb29",
        "position": "LEFT_REAR",
        "tpmId": ""
      },
      {
        "axleId": "e252bf7e-6867-4eab-bec1-e4dbad3eb6dd",
        "id": "21026dfa-499f-47e7-97d1-11ae728220ab",
        "position": "RIGHT_REAR",
        "tpmId": ""
      },
      {
        "axleId": "e252bf7e-6867-4eab-bec1-e4dbad3eb6dd",
        "id": "dbe18445-8758-4818-a405-5b29bc1dee90",
        "position": "RIGHT_FRONT",
        "tpmId": ""
      }
    ]
  }
}