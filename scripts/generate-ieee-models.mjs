import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "data", "schemes", "files", "IEEE标准算例");
const layerId = "layer-default";
const routableLinePointsParam = "_routableLinePoints";
const routableLineSourceNodeParam = "_routableLineSourceNodeId";
const routableLineSourceTerminalParam = "_routableLineSourceTerminalId";
const routableLineSourceLocalPointParam = "_routableLineSourceLocalPoint";
const routableLineTargetNodeParam = "_routableLineTargetNodeId";
const routableLineTargetTerminalParam = "_routableLineTargetTerminalId";
const routableLineTargetLocalPointParam = "_routableLineTargetLocalPoint";

const cases = [
  {
    modelName: "IEEE14",
    title: "IEEE 14 Bus Test Case",
    url: "https://raw.githubusercontent.com/MATPOWER/matpower/master/data/case14.m"
  },
  {
    modelName: "IEEE39",
    title: "IEEE 39 Bus New England System",
    url: "https://raw.githubusercontent.com/MATPOWER/matpower/master/data/case39.m"
  },
  {
    modelName: "IEEE118",
    title: "IEEE 118 Bus Test Case",
    url: "https://raw.githubusercontent.com/MATPOWER/matpower/master/data/case118.m"
  }
];

const ieee118GeneratorBusNos = [
  1, 4, 6, 8, 10, 12, 15, 18, 19, 24, 25, 26, 27, 31, 32, 34, 36, 40, 42, 46, 49, 54, 55,
  56, 59, 61, 62, 65, 66, 69, 70, 72, 73, 74, 76, 77, 80, 85, 87, 89, 90, 91, 92, 99, 100,
  103, 104, 105, 107, 110, 111, 112, 113, 116
];

const ieee118LoadBusNos = [
  1, 2, 3, 4, 6, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29,
  31, 32, 33, 34, 35, 36, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55,
  56, 57, 58, 59, 60, 62, 66, 67, 70, 72, 73, 74, 75, 76, 77, 78, 79, 80, 82, 83, 84, 85, 86,
  88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108,
  109, 110, 112, 113, 114, 115, 116, 117, 118
];

const ieee118Buses = scaleImageCoordinates(
  {
    1: { x: 15, y: 49 },
    2: { x: 80, y: 38 },
    3: { x: 80, y: 90 },
    4: { x: 58, y: 132 },
    5: { x: 42, y: 210 },
    6: { x: 128, y: 210 },
    7: { x: 166, y: 210 },
    8: { x: 52, y: 352 },
    9: { x: 54, y: 420 },
    10: { x: 58, y: 472 },
    11: { x: 110, y: 136 },
    12: { x: 205, y: 100 },
    13: { x: 248, y: 222 },
    14: { x: 323, y: 150 },
    15: { x: 326, y: 190 },
    16: { x: 174, y: 266 },
    17: { x: 292, y: 302 },
    18: { x: 382, y: 303 },
    19: { x: 386, y: 262 },
    20: { x: 397, y: 402 },
    21: { x: 398, y: 452 },
    22: { x: 426, y: 476 },
    23: { x: 405, y: 512 },
    24: { x: 556, y: 410 },
    25: { x: 355, y: 575 },
    26: { x: 286, y: 535 },
    27: { x: 104, y: 508 },
    28: { x: 104, y: 444 },
    29: { x: 105, y: 402 },
    30: { x: 224, y: 342 },
    31: { x: 150, y: 402 },
    32: { x: 218, y: 420 },
    33: { x: 536, y: 108 },
    34: { x: 580, y: 180 },
    35: { x: 496, y: 260 },
    36: { x: 605, y: 260 },
    37: { x: 626, y: 160 },
    38: { x: 692, y: 304 },
    39: { x: 612, y: 92 },
    40: { x: 655, y: 40 },
    41: { x: 716, y: 39 },
    42: { x: 748, y: 40 },
    43: { x: 690, y: 188 },
    44: { x: 742, y: 156 },
    45: { x: 744, y: 242 },
    46: { x: 708, y: 285 },
    47: { x: 755, y: 303 },
    48: { x: 805, y: 250 },
    49: { x: 850, y: 302 },
    50: { x: 900, y: 185 },
    51: { x: 936, y: 188 },
    52: { x: 828, y: 110 },
    53: { x: 828, y: 40 },
    54: { x: 890, y: 39 },
    55: { x: 996, y: 39 },
    56: { x: 944, y: 40 },
    57: { x: 900, y: 138 },
    58: { x: 950, y: 140 },
    59: { x: 1082, y: 52 },
    60: { x: 1070, y: 202 },
    61: { x: 1070, y: 252 },
    62: { x: 1022, y: 360 },
    63: { x: 1024, y: 116 },
    64: { x: 1004, y: 253 },
    65: { x: 940, y: 431 },
    66: { x: 910, y: 386 },
    67: { x: 970, y: 352 },
    68: { x: 850, y: 386 },
    69: { x: 810, y: 386 },
    70: { x: 650, y: 430 },
    71: { x: 620, y: 397 },
    72: { x: 556, y: 410 },
    73: { x: 604, y: 355 },
    74: { x: 603, y: 508 },
    75: { x: 620, y: 560 },
    76: { x: 750, y: 550 },
    77: { x: 735, y: 590 },
    78: { x: 790, y: 520 },
    79: { x: 812, y: 497 },
    80: { x: 850, y: 552 },
    81: { x: 852, y: 526 },
    82: { x: 740, y: 630 },
    83: { x: 617, y: 655 },
    84: { x: 590, y: 685 },
    85: { x: 618, y: 735 },
    86: { x: 620, y: 775 },
    87: { x: 621, y: 792 },
    88: { x: 668, y: 735 },
    89: { x: 710, y: 735 },
    90: { x: 706, y: 785 },
    91: { x: 815, y: 790 },
    92: { x: 805, y: 735 },
    93: { x: 850, y: 735 },
    94: { x: 883, y: 657 },
    95: { x: 820, y: 660 },
    96: { x: 830, y: 710 },
    97: { x: 803, y: 600 },
    98: { x: 910, y: 586 },
    99: { x: 930, y: 535 },
    100: { x: 955, y: 655 },
    101: { x: 930, y: 790 },
    102: { x: 852, y: 780 },
    103: { x: 980, y: 660 },
    104: { x: 1016, y: 650 },
    105: { x: 1050, y: 660 },
    106: { x: 1085, y: 575 },
    107: { x: 1122, y: 660 },
    108: { x: 1040, y: 715 },
    109: { x: 1060, y: 747 },
    110: { x: 1060, y: 790 },
    111: { x: 1000, y: 818 },
    112: { x: 1120, y: 812 },
    113: { x: 227, y: 344 },
    114: { x: 188, y: 485 },
    115: { x: 250, y: 490 },
    116: { x: 875, y: 410 },
    117: { x: 270, y: 105 },
    118: { x: 690, y: 545 }
  },
  { scaleX: 4.55, scaleY: 4.55, offsetX: 180, offsetY: 150 }
);

const ieee118GeneratorDirections = buildDirectionMap(ieee118GeneratorBusNos, "N", {
  4: "W",
  8: "W",
  10: "S",
  12: "E",
  18: "NW",
  19: "W",
  24: "N",
  25: "S",
  26: "E",
  27: "S",
  31: "W",
  32: "N",
  34: "NE",
  36: "NE",
  46: "NW",
  49: "SW",
  59: "E",
  61: "W",
  62: "S",
  65: "S",
  66: "NW",
  69: "W",
  70: "W",
  74: "W",
  76: "N",
  77: "S",
  80: "E",
  85: "W",
  87: "S",
  89: "N",
  90: "S",
  91: "S",
  92: "N",
  99: "N",
  100: "NE",
  103: "E",
  104: "N",
  105: "N",
  107: "NE",
  110: "SE",
  111: "S",
  112: "S",
  113: "W",
  116: "W"
});

const ieee118LoadDirections = buildDirectionMap(ieee118LoadBusNos, "S", {
  1: "W",
  2: "N",
  3: "W",
  4: "S",
  11: "N",
  12: "S",
  13: "W",
  15: "E",
  20: "W",
  21: "E",
  22: "E",
  24: "W",
  29: "W",
  31: "W",
  33: "N",
  35: "W",
  39: "W",
  40: "N",
  41: "N",
  42: "N",
  43: "N",
  44: "N",
  47: "W",
  48: "N",
  49: "W",
  50: "W",
  51: "E",
  52: "N",
  53: "N",
  54: "N",
  57: "W",
  58: "E",
  59: "E",
  60: "W",
  67: "N",
  70: "SW",
  72: "W",
  73: "S",
  74: "S",
  76: "N",
  82: "N",
  100: "N",
  104: "N",
  105: "N",
  106: "N",
  108: "E",
  109: "E",
  113: "W",
  116: "E",
  118: "N"
});
const ieee118ResolvedLoadDirections = avoidDeviceDirectionCollisions(ieee118LoadDirections, ieee118GeneratorDirections);

const manualLayouts = {
  IEEE14: {
    canvas: { width: 2600, height: 2200 },
    titlePosition: { x: 1300, y: 70 },
    busScaleX: 1.45,
    buses: {
      1: { x: 380, y: 430 },
      2: { x: 610, y: 200 },
      3: { x: 1980, y: 200 },
      4: { x: 1980, y: 620 },
      5: { x: 610, y: 620 },
      6: { x: 520, y: 1320 },
      7: { x: 1780, y: 1030 },
      8: { x: 1260, y: 1030 },
      9: { x: 1980, y: 1320 },
      10: { x: 1500, y: 1320 },
      11: { x: 1050, y: 1320 },
      12: { x: 650, y: 1540 },
      13: { x: 650, y: 1980 },
      14: { x: 1980, y: 1980 }
    },
    generators: {
      1: { x: 250, y: 320, anchor: { x: 0.5, y: 0 } },
      2: { x: 610, y: 80, anchor: { x: 0, y: 0.5 } },
      3: { x: 1980, y: 80, anchor: { x: 0, y: 0.5 } },
      6: { x: 400, y: 1180, anchor: { x: 0, y: 0.5 } },
      8: { x: 1260, y: 900, anchor: { x: 0, y: 0.5 } }
    },
    loads: {
      2: { x: 830, y: 320 },
      3: { x: 2150, y: 320 },
      4: { x: 1810, y: 760 },
      5: { x: 650, y: 760 },
      6: { x: 360, y: 1440 },
      9: { x: 2140, y: 1440 },
      10: { x: 1500, y: 1460 },
      11: { x: 1050, y: 1460 },
      12: { x: 720, y: 1660 },
      13: { x: 570, y: 2120 },
      14: { x: 2000, y: 2120 }
    },
    branches: {
      "1-2": { via: [{ x: 380, y: 200 }] },
      "1-5": { via: [{ x: 380, y: 620 }] },
      "2-3": { via: [{ x: 610, y: 120 }, { x: 1980, y: 120 }] },
      "2-4": { via: [{ x: 760, y: 420 }, { x: 1880, y: 420 }, { x: 1880, y: 620 }] },
      "2-5": { via: [] },
      "3-4": { via: [] },
      "4-5": { via: [{ x: 1800, y: 620 }, { x: 1800, y: 560 }, { x: 760, y: 560 }, { x: 760, y: 620 }] },
      "4-7": {
        device: { x: 1900, y: 820 },
        rotation: 90,
        fromVia: [{ x: 1980, y: 774 }],
        toVia: [{ x: 1900, y: 1030 }]
      },
      "4-9": {
        device: { x: 2140, y: 820 },
        rotation: 90,
        fromVia: [{ x: 2140, y: 620 }],
        toVia: [{ x: 2140, y: 1320 }]
      },
      "5-6": {
        device: { x: 520, y: 820 },
        rotation: 90,
        fromVia: [{ x: 520, y: 620 }],
        toVia: [{ x: 520, y: 1320 }]
      },
      "6-11": { via: [{ x: 720, y: 1280 }, { x: 1050, y: 1280 }] },
      "6-12": { via: [{ x: 650, y: 1320 }] },
      "6-13": { via: [{ x: 520, y: 1980 }] },
      "7-8": { via: [{ x: 1780, y: 980 }, { x: 1260, y: 980 }] },
      "7-9": { via: [{ x: 1980, y: 1030 }] },
      "9-10": { via: [{ x: 1980, y: 1280 }, { x: 1500, y: 1280 }] },
      "9-14": { via: [] },
      "10-11": { via: [{ x: 1500, y: 1280 }, { x: 1050, y: 1280 }] },
      "12-13": { via: [] },
      "13-14": { via: [{ x: 650, y: 1940 }, { x: 1980, y: 1940 }] }
    }
  },
  IEEE39: {
    canvas: { width: 3600, height: 2480 },
    titlePosition: { x: 1800, y: 80 },
    busScaleX: 1.25,
    buses: {
      1: { x: 430, y: 560 },
      2: { x: 430, y: 430 },
      3: { x: 760, y: 760 },
      4: { x: 760, y: 1360 },
      5: { x: 760, y: 1600 },
      6: { x: 1220, y: 1740 },
      7: { x: 760, y: 1980 },
      8: { x: 430, y: 2220 },
      9: { x: 430, y: 1760 },
      10: { x: 1640, y: 2110 },
      11: { x: 1470, y: 1990 },
      12: { x: 1570, y: 1800 },
      13: { x: 1650, y: 1600 },
      14: { x: 1840, y: 1360 },
      15: { x: 2040, y: 1160 },
      16: { x: 2460, y: 1010 },
      17: { x: 2300, y: 760 },
      18: { x: 1660, y: 760 },
      19: { x: 2320, y: 1780 },
      20: { x: 2320, y: 2180 },
      21: { x: 3050, y: 1010 },
      22: { x: 2920, y: 2020 },
      23: { x: 3070, y: 1650 },
      24: { x: 2510, y: 1360 },
      25: { x: 1120, y: 300 },
      26: { x: 1890, y: 300 },
      27: { x: 2280, y: 560 },
      28: { x: 2670, y: 300 },
      29: { x: 3070, y: 300 },
      30: { x: 430, y: 220 },
      31: { x: 1220, y: 2260 },
      32: { x: 1640, y: 2280 },
      33: { x: 2620, y: 2260 },
      34: { x: 2320, y: 2320 },
      35: { x: 3070, y: 2320 },
      36: { x: 2910, y: 1380 },
      37: { x: 1120, y: 220 },
      38: { x: 3070, y: 620 },
      39: { x: 430, y: 760 }
    },
    generators: {
      30: { x: 430, y: 78, anchor: { x: 0, y: 0.5 } },
      31: { x: 1220, y: 2380, anchor: { x: 0, y: -0.5 } },
      32: { x: 1640, y: 2390, anchor: { x: 0, y: -0.5 } },
      33: { x: 2620, y: 2380, anchor: { x: 0, y: -0.5 } },
      34: { x: 2320, y: 2420, anchor: { x: 0, y: -0.5 } },
      35: { x: 3070, y: 2420, anchor: { x: 0, y: -0.5 } },
      36: { x: 2910, y: 1220, anchor: { x: 0, y: 0.5 } },
      37: { x: 1120, y: 78, anchor: { x: 0, y: 0.5 } },
      38: { x: 3070, y: 760, anchor: { x: 0, y: -0.5 } },
      39: { x: 190, y: 650, anchor: { x: 0.5, y: 0 } }
    },
    loads: {
      1: { x: 250, y: 820, anchor: { x: 0.5, y: 0 } },
      3: { x: 650, y: 850, anchor: { x: 0.5, y: 0 } },
      4: { x: 650, y: 1450, anchor: { x: 0.5, y: 0 } },
      7: { x: 820, y: 2100 },
      8: { x: 570, y: 2360 },
      9: { x: 250, y: 1860, anchor: { x: 0.5, y: 0 } },
      12: { x: 1760, y: 1920 },
      15: { x: 2040, y: 1310 },
      16: { x: 2460, y: 1160 },
      18: { x: 1660, y: 890 },
      20: { x: 2200, y: 2280 },
      21: { x: 3050, y: 1170 },
      23: { x: 2820, y: 1850 },
      24: { x: 2510, y: 1510 },
      25: { x: 1120, y: 460 },
      26: { x: 1890, y: 470 },
      27: { x: 2180, y: 690 },
      28: { x: 2670, y: 470 },
      29: { x: 3070, y: 470 },
      31: { x: 1360, y: 2300, anchor: { x: -0.5, y: 0 } },
      39: { x: 250, y: 900, anchor: { x: 0.5, y: 0 } }
    },
    branches: {
      "1-2": { via: [] },
      "1-39": { via: [{ x: 430, y: 760 }] },
      "2-3": { via: [{ x: 760, y: 430 }] },
      "2-25": { via: [{ x: 760, y: 430 }, { x: 760, y: 300 }] },
      "2-30": { via: [] },
      "3-4": { via: [] },
      "3-18": { via: [] },
      "4-5": { via: [] },
      "4-14": { via: [] },
      "5-6": { via: [{ x: 1220, y: 1600 }] },
      "5-8": { via: [{ x: 620, y: 1600 }, { x: 620, y: 2220 }] },
      "6-7": { via: [{ x: 760, y: 1740 }] },
      "6-11": { via: [{ x: 1470, y: 1740 }] },
      "6-31": { via: [] },
      "7-8": { via: [{ x: 760, y: 2220 }] },
      "8-9": { via: [] },
      "9-39": { via: [{ x: 430, y: 760 }] },
      "10-11": { via: [{ x: 1470, y: 2110 }] },
      "10-13": { via: [] },
      "10-32": { via: [] },
      "12-11": { via: [] },
      "12-13": { via: [] },
      "13-14": { via: [{ x: 1840, y: 1600 }] },
      "14-15": { via: [{ x: 2040, y: 1360 }] },
      "15-16": { via: [{ x: 2040, y: 1010 }] },
      "16-17": { via: [{ x: 2300, y: 1010 }] },
      "16-19": { via: [{ x: 2320, y: 1010 }] },
      "16-21": { via: [] },
      "16-24": { via: [] },
      "17-18": { via: [] },
      "17-27": { via: [] },
      "19-20": { via: [] },
      "19-33": { via: [{ x: 2620, y: 1780 }] },
      "20-34": { via: [] },
      "21-22": { via: [{ x: 3070, y: 1010 }, { x: 3070, y: 2020 }] },
      "22-23": { via: [{ x: 3070, y: 2020 }] },
      "22-35": { via: [{ x: 3070, y: 2020 }] },
      "23-24": { via: [{ x: 2510, y: 1650 }] },
      "23-36": { via: [{ x: 2910, y: 1650 }] },
      "25-26": { via: [] },
      "25-37": { via: [] },
      "26-27": { via: [{ x: 2280, y: 300 }] },
      "26-28": { via: [] },
      "26-29": { via: [{ x: 2280, y: 200 }, { x: 3070, y: 200 }] },
      "28-29": { via: [] },
      "29-38": { via: [] }
    }
  },
  IEEE118: {
    canvas: { width: 5500, height: 4100 },
    titlePosition: { x: 2750, y: 70 },
    busScaleX: 1.05,
    buses: ieee118Buses,
    generators: directionalDevicePositions(ieee118Buses, ieee118GeneratorDirections, 160),
    loads: directionalDevicePositions(ieee118Buses, ieee118ResolvedLoadDirections, 145),
    branches: {}
  }
};

function scaleImageCoordinates(points, { scaleX, scaleY, offsetX, offsetY }) {
  return Object.fromEntries(
    Object.entries(points).map(([key, point]) => [
      key,
      {
        x: round(offsetX + point.x * scaleX, 1),
        y: round(offsetY + point.y * scaleY, 1)
      }
    ])
  );
}

function buildDirectionMap(busNos, defaultDirection, overrides = {}) {
  return Object.fromEntries(busNos.map((busNo) => [busNo, overrides[busNo] ?? defaultDirection]));
}

function directionVector(direction) {
  const vectors = {
    N: { x: 0, y: -1 },
    NE: { x: 1, y: -1 },
    E: { x: 1, y: 0 },
    SE: { x: 1, y: 1 },
    S: { x: 0, y: 1 },
    SW: { x: -1, y: 1 },
    W: { x: -1, y: 0 },
    NW: { x: -1, y: -1 }
  };
  const vector = vectors[direction] ?? vectors.S;
  const length = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

function oppositeDirection(direction) {
  const opposites = {
    N: "S",
    NE: "SW",
    E: "W",
    SE: "NW",
    S: "N",
    SW: "NE",
    W: "E",
    NW: "SE"
  };
  return opposites[direction] ?? "N";
}

function avoidDeviceDirectionCollisions(primaryDirections, blockerDirections) {
  return Object.fromEntries(
    Object.entries(primaryDirections).map(([busNo, direction]) => [
      busNo,
      blockerDirections[busNo] === direction ? oppositeDirection(direction) : direction
    ])
  );
}

function directionalDevicePositions(buses, directions, distance) {
  return Object.fromEntries(
    Object.entries(directions)
      .filter(([busNo]) => buses[busNo])
      .map(([busNo, direction]) => {
        const bus = buses[busNo];
        const vector = directionVector(direction);
        return [
          busNo,
          {
            x: round(bus.x + vector.x * distance, 1),
            y: round(bus.y + vector.y * distance, 1),
            anchor: {
              x: round(-vector.x * 0.5, 3),
              y: round(-vector.y * 0.5, 3)
            }
          }
        ];
      })
  );
}

const busColumns = {
  busNo: 0,
  type: 1,
  pd: 2,
  qd: 3,
  gs: 4,
  bs: 5,
  vm: 7,
  va: 8,
  baseKv: 9
};

const genColumns = {
  busNo: 0,
  pg: 1,
  qg: 2,
  vg: 5,
  status: 7
};

const branchColumns = {
  fromBus: 0,
  toBus: 1,
  r: 2,
  x: 3,
  b: 4,
  tap: 8,
  shift: 9,
  status: 10
};

function stripInlineComment(line) {
  return line.replace(/%.*$/u, "");
}

function parseScalar(text, name) {
  const match = new RegExp(`mpc\\.${name}\\s*=\\s*([^;]+);`, "u").exec(text);
  return match ? Number(match[1].trim().replace(/'/gu, "")) : 0;
}

function parseMatrix(text, name) {
  const match = new RegExp(`mpc\\.${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`, "u").exec(text);
  if (!match) {
    return [];
  }
  return match[1]
    .split(/\n/gu)
    .map(stripInlineComment)
    .join("\n")
    .split(";")
    .map((row) => row.replace(/[\[\],]/gu, " ").trim())
    .filter(Boolean)
    .map((row) => row.split(/\s+/gu).map(Number).filter((value) => Number.isFinite(value)));
}

function parseMatpowerCase(text) {
  return {
    baseMva: parseScalar(text, "baseMVA") || 100,
    bus: parseMatrix(text, "bus"),
    gen: parseMatrix(text, "gen"),
    branch: parseMatrix(text, "branch")
  };
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function numericText(value, digits = 6) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return String(round(value, digits));
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function activeBranchRows(rows) {
  return rows.filter((row) => row[branchColumns.status] !== 0);
}

function activeGeneratorRows(rows) {
  return rows.filter((row) => row[genColumns.status] !== 0);
}

function effectiveBaseKv(row) {
  const value = row[busColumns.baseKv];
  return Number.isFinite(value) && value > 0 ? value : 100;
}

function canvasSize(busCount) {
  const width = Math.max(1920, Math.ceil(Math.sqrt(busCount) * 380));
  const height = Math.max(1024, Math.ceil(Math.sqrt(busCount) * 260));
  return {
    width: Math.ceil(width / 20) * 20,
    height: Math.ceil(height / 20) * 20
  };
}

function computeBusLayout(busRows, branchRows, size, seed) {
  const rand = seededRandom(seed);
  const busNos = busRows.map((row) => row[busColumns.busNo]);
  const indexByBusNo = new Map(busNos.map((busNo, index) => [busNo, index]));
  const n = busRows.length;
  const margin = 260;
  const areaWidth = size.width - margin * 2;
  const areaHeight = size.height - margin * 2;
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const radiusX = areaWidth * 0.38;
  const radiusY = areaHeight * 0.38;
  const points = busRows.map((row, index) => {
    const busNo = row[busColumns.busNo];
    const angle = (2 * Math.PI * index) / Math.max(1, n);
    const jitter = 0.88 + rand() * 0.24;
    return {
      busNo,
      x: centerX + Math.cos(angle) * radiusX * jitter,
      y: centerY + Math.sin(angle) * radiusY * jitter
    };
  });
  const edges = activeBranchRows(branchRows)
    .map((row) => ({
      from: indexByBusNo.get(row[branchColumns.fromBus]),
      to: indexByBusNo.get(row[branchColumns.toBus])
    }))
    .filter((edge) => edge.from !== undefined && edge.to !== undefined && edge.from !== edge.to);
  const k = Math.sqrt((areaWidth * areaHeight) / Math.max(1, n));
  let temperature = Math.max(size.width, size.height) * 0.08;
  const iterations = n > 80 ? 420 : 520;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const disp = points.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        let dx = points[i].x - points[j].x;
        let dy = points[i].y - points[j].y;
        let distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (k * k) / distance;
        dx /= distance;
        dy /= distance;
        disp[i].x += dx * force;
        disp[i].y += dy * force;
        disp[j].x -= dx * force;
        disp[j].y -= dy * force;
      }
    }
    for (const edge of edges) {
      const from = edge.from;
      const to = edge.to;
      let dx = points[from].x - points[to].x;
      let dy = points[from].y - points[to].y;
      let distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (distance * distance) / (k * 1.55);
      dx /= distance;
      dy /= distance;
      disp[from].x -= dx * force;
      disp[from].y -= dy * force;
      disp[to].x += dx * force;
      disp[to].y += dy * force;
    }
    for (let i = 0; i < points.length; i += 1) {
      const length = Math.sqrt(disp[i].x * disp[i].x + disp[i].y * disp[i].y) || 0.01;
      points[i].x += (disp[i].x / length) * Math.min(length, temperature);
      points[i].y += (disp[i].y / length) * Math.min(length, temperature);
      points[i].x = Math.min(size.width - margin, Math.max(margin, points[i].x));
      points[i].y = Math.min(size.height - margin, Math.max(margin, points[i].y));
    }
    temperature *= 0.985;
  }
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const scale = Math.min(areaWidth / Math.max(1, maxX - minX), areaHeight / Math.max(1, maxY - minY));
  return new Map(points.map((point) => [
    point.busNo,
    {
      x: round(margin + (point.x - minX) * scale, 1),
      y: round(margin + (point.y - minY) * scale, 1)
    }
  ]));
}

function rotatePoint(origin, local, rotationDegrees) {
  const radians = (rotationDegrees * Math.PI) / 180;
  return {
    x: round(origin.x + local.x * Math.cos(radians) - local.y * Math.sin(radians), 1),
    y: round(origin.y + local.x * Math.sin(radians) + local.y * Math.cos(radians), 1)
  };
}

function pointToNodeLocal(node, point) {
  const radians = (-(node.rotation ?? 0) * Math.PI) / 180;
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  return {
    x: round(dx * Math.cos(radians) - dy * Math.sin(radians), 1),
    y: round(dx * Math.sin(radians) + dy * Math.cos(radians), 1)
  };
}

function terminalPoint(node, terminalId) {
  const terminal = node.terminals.find((item) => item.id === terminalId) ?? node.terminals[0];
  const local = {
    x: (terminal?.anchor.x ?? 0) * node.size.width * Math.abs(node.scaleX ?? node.scale ?? 1),
    y: (terminal?.anchor.y ?? 0) * node.size.height * Math.abs(node.scaleY ?? node.scale ?? 1)
  };
  return rotatePoint(node.position, local, node.rotation ?? 0);
}

function makeTerminal(caseName, id, label, type, anchor, vbase, sequence) {
  return {
    id,
    label,
    type,
    anchor,
    nodeNumber: `${caseName}-N${sequence}`,
    vbase: numericText(vbase, 3)
  };
}

function makeBaseNode({ id, kind, name, position, size, rotation = 0, scale = 1, scaleX = 1, scaleY = 1, terminals = [], params = {} }) {
  return {
    id,
    kind,
    name,
    layerId,
    nodeNumber: `${id}-node`,
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position,
    size,
    rotation,
    scale,
    scaleX,
    scaleY,
    terminals,
    params
  };
}

function makeBusTerminals(caseName, count, baseKv) {
  return Array.from({ length: count }, (_, index) => {
    const anchorX = count <= 1 ? 0 : -0.48 + (0.96 * index) / Math.max(1, count - 1);
    return makeTerminal(caseName, `t${index + 1}`, `交流设备端${index + 1}`, "ac", { x: round(anchorX, 4), y: 0 }, baseKv, index + 1);
  });
}

function busTerminalCanvasPoint(bus, terminalId) {
  const terminal = bus.terminals.find((item) => item.id === terminalId);
  if (!terminal) {
    return { ...bus.position };
  }
  const width = bus.size.width * Math.abs(bus.scaleX ?? bus.scale ?? 1);
  return {
    x: round(bus.position.x + terminal.anchor.x * width, 1),
    y: round(bus.position.y, 1)
  };
}

function baseElectricalParams(extra = {}) {
  return {
    run_stat: "运行",
    vbase: "100",
    ...extra
  };
}

function titleNode(caseDef, size) {
  const manualLayout = manualLayouts[caseDef.modelName];
  return makeBaseNode({
    id: `${caseDef.modelName.toLowerCase()}-title`,
    kind: "static-text",
    name: `${caseDef.modelName} 标题`,
    position: manualLayout?.titlePosition ?? { x: 360, y: 80 },
    size: { width: 560, height: 56 },
    terminals: [],
    params: {
      component_type: "StaticTextSymbol",
      routeAvoidance: "0",
      text: `${caseDef.title} / MATPOWER`,
      fillColor: "transparent",
      strokeColor: "transparent",
      textColor: "#0f172a",
      lineWidth: "0",
      strokeStyle: "solid",
      fontSize: "28",
      fontFamily: "Arial",
      fontWeight: "700",
      fontStyle: "normal",
      textDecoration: "none",
      idx: "1"
    }
  });
}

function shouldUseTransformer(branch, fromBus, toBus) {
  const tap = branch[branchColumns.tap] || 0;
  const shift = branch[branchColumns.shift] || 0;
  const fromBase = effectiveBaseKv(fromBus);
  const toBase = effectiveBaseKv(toBus);
  return Math.abs(tap) > 1e-9 || Math.abs(shift) > 1e-9 || Math.abs(fromBase - toBase) > 1e-9;
}

function routableLineEndpointAnchorForLocalPoint(local, size) {
  const safeWidth = Math.max(1, size.width);
  const safeHeight = Math.max(1, size.height);
  const clampAnchor = (value) => Math.max(-0.48, Math.min(0.48, value));
  return {
    x: clampAnchor(local.x / safeWidth),
    y: clampAnchor(local.y / safeHeight)
  };
}

function normalizeRoutePoints(points) {
  const normalized = [];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue;
    }
    const next = { x: round(point.x, 1), y: round(point.y, 1) };
    const previous = normalized.at(-1);
    if (!previous || previous.x !== next.x || previous.y !== next.y) {
      normalized.push(next);
    }
  }
  return normalized;
}

function serializeRoutableLinePoints(points) {
  return JSON.stringify(normalizeRoutePoints(points));
}

function lineRouteCenter(points) {
  const start = points[0];
  const end = points[points.length - 1];
  return {
    x: round((start.x + end.x) / 2, 1),
    y: round((start.y + end.y) / 2, 1)
  };
}

function branchLayoutKey(fromBusNo, toBusNo) {
  return `${fromBusNo}-${toBusNo}`;
}

function manualBranchLayout(manualLayout, fromBusNo, toBusNo) {
  const branches = manualLayout?.branches;
  if (!branches) {
    return undefined;
  }
  const forward = branches[branchLayoutKey(fromBusNo, toBusNo)];
  if (forward) {
    return forward;
  }
  const reverse = branches[branchLayoutKey(toBusNo, fromBusNo)];
  return reverse
    ? {
        ...reverse,
        via: [...(reverse.via ?? [])].reverse(),
        fromVia: [...(reverse.toVia ?? [])].reverse(),
        toVia: [...(reverse.fromVia ?? [])].reverse()
      }
    : undefined;
}

function buildOrthogonalRoutePoints(start, end, via = []) {
  const skeleton = normalizeRoutePoints([start, ...via, end]);
  if (skeleton.length <= 2) {
    const [first, last] = skeleton;
    if (!first || !last || first.x === last.x || first.y === last.y) {
      return skeleton;
    }
    return normalizeRoutePoints([first, { x: last.x, y: first.y }, last]);
  }
  const route = [skeleton[0]];
  for (let index = 1; index < skeleton.length; index += 1) {
    const previous = route[route.length - 1];
    const next = skeleton[index];
    if (!previous || !next) {
      continue;
    }
    if (previous.x !== next.x && previous.y !== next.y) {
      route.push({ x: next.x, y: previous.y });
    }
    route.push(next);
  }
  return normalizeRoutePoints(route);
}

function makeDeviceTerminals(caseName, type, vbase, count = 2, singleAnchor) {
  if (count === 1) {
    return [makeTerminal(caseName, "t1", "交流设备端1", type, singleAnchor ?? { x: 0.5, y: 0 }, vbase, 1)];
  }
  return [
    makeTerminal(caseName, "t1", "交流设备端1", type, { x: -0.5, y: 0 }, vbase, 1),
    makeTerminal(caseName, "t2", "交流设备端2", type, { x: 0.5, y: 0 }, vbase, 2)
  ];
}

function makeLoadTerminal(caseName, vbase, anchor = { x: 0, y: -0.5 }) {
  return [makeTerminal(caseName, "t1", "交流设备端1", "ac", anchor, vbase, 1)];
}

function makeRoutableLineTerminals(caseName, vbase, localStart, localEnd, size) {
  return [
    makeTerminal(caseName, "t1", "交流设备端1", "ac", routableLineEndpointAnchorForLocalPoint(localStart, size), vbase, 1),
    makeTerminal(caseName, "t2", "交流设备端2", "ac", routableLineEndpointAnchorForLocalPoint(localEnd, size), vbase, 2)
  ];
}

function makeRoutableLineNode({
  caseName,
  id,
  name,
  routePoints,
  sourceNode,
  sourceTerminalId,
  targetNode,
  targetTerminalId,
  vbase,
  params
}) {
  const size = { width: 150, height: 36 };
  const position = lineRouteCenter(routePoints);
  const localPoints = routePoints.map((point) => ({
    x: round(point.x - position.x, 1),
    y: round(point.y - position.y, 1)
  }));
  const localStart = localPoints[0] ?? { x: -size.width / 2, y: 0 };
  const localEnd = localPoints[localPoints.length - 1] ?? { x: size.width / 2, y: 0 };
  return makeBaseNode({
    id,
    kind: "ac-routable-line",
    name,
    position,
    size,
    terminals: makeRoutableLineTerminals(caseName, vbase, localStart, localEnd, size),
    params: {
      ...params,
      component_type: "ACBranch",
      lineWidth: "4",
      [routableLinePointsParam]: serializeRoutableLinePoints(localPoints),
      [routableLineSourceNodeParam]: sourceNode.id,
      [routableLineSourceTerminalParam]: sourceTerminalId,
      [routableLineSourceLocalPointParam]: serializeRoutableLinePoints([pointToNodeLocal(sourceNode, routePoints[0])]),
      [routableLineTargetNodeParam]: targetNode.id,
      [routableLineTargetTerminalParam]: targetTerminalId,
      [routableLineTargetLocalPointParam]: serializeRoutableLinePoints([pointToNodeLocal(targetNode, routePoints[routePoints.length - 1])])
    }
  });
}

function addEdge(edges, id, source, target, sourceTerminalId, targetTerminalId, sourcePoint, targetPoint, routePoints) {
  const start = source.kind === "ac-bus" ? sourcePoint : terminalPoint(source, sourceTerminalId);
  const end = target.kind === "ac-bus" ? targetPoint : terminalPoint(target, targetTerminalId);
  edges.push({
    id,
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId,
    targetTerminalId,
    ...(source.kind === "ac-bus" ? { sourcePoint } : {}),
    ...(target.kind === "ac-bus" ? { targetPoint } : {}),
    routePoints: routePoints ?? buildOrthogonalRoutePoints(start, end)
  });
}

function buildProject(caseDef, parsed) {
  const manualLayout = manualLayouts[caseDef.modelName];
  const activeBranches = activeBranchRows(parsed.branch);
  const activeGens = activeGeneratorRows(parsed.gen);
  const busByNo = new Map(parsed.bus.map((row) => [row[busColumns.busNo], row]));
  const size = manualLayout?.canvas ?? canvasSize(parsed.bus.length);
  const layout = manualLayout?.buses
    ? new Map(Object.entries(manualLayout.buses).map(([busNo, point]) => [Number(busNo), point]))
    : computeBusLayout(parsed.bus, activeBranches, size, Number(caseDef.modelName.replace(/\D/gu, "")) || 1);
  const busConnectionCounts = new Map(parsed.bus.map((row) => [row[busColumns.busNo], 0]));
  const incrementBus = (busNo) => busConnectionCounts.set(busNo, (busConnectionCounts.get(busNo) ?? 0) + 1);
  for (const branch of activeBranches) {
    incrementBus(branch[branchColumns.fromBus]);
    incrementBus(branch[branchColumns.toBus]);
  }
  for (const gen of activeGens) {
    incrementBus(gen[genColumns.busNo]);
  }
  for (const bus of parsed.bus) {
    if (Math.abs(bus[busColumns.pd]) > 1e-9 || Math.abs(bus[busColumns.qd]) > 1e-9) {
      incrementBus(bus[busColumns.busNo]);
    }
  }

  const nodes = [titleNode(caseDef, size)];
  const edges = [];
  const busNodes = new Map();
  const nextBusTerminalIndex = new Map();

  for (const bus of parsed.bus) {
    const busNo = bus[busColumns.busNo];
    const baseKv = effectiveBaseKv(bus);
    const count = busConnectionCounts.get(busNo) ?? 0;
    const position = layout.get(busNo) ?? { x: 260, y: 260 };
    const busNode = makeBaseNode({
      id: `${caseDef.modelName.toLowerCase()}-bus-${busNo}`,
      kind: "ac-bus",
      name: `Bus ${busNo}`,
      position,
      size: { width: 120, height: 28 },
      scaleX: manualLayout?.busScaleX ?? Math.max(1, Math.min(2.6, count / 3)),
      terminals: makeBusTerminals(caseDef.modelName, count, baseKv),
      params: baseElectricalParams({
        idx: String(busNo),
        vbase: numericText(baseKv, 3),
        voltage: numericText(bus[busColumns.vm] * baseKv, 3),
        angle: numericText(bus[busColumns.va], 3),
        voltageLevel: `${numericText(baseKv, 3)} kV`,
        section: `IEEE ${caseDef.modelName}`
      })
    });
    busNodes.set(busNo, busNode);
    nodes.push(busNode);
  }

  const takeBusEndpoint = (busNo) => {
    const bus = busNodes.get(busNo);
    const index = nextBusTerminalIndex.get(busNo) ?? 0;
    nextBusTerminalIndex.set(busNo, index + 1);
    const terminalId = `t${index + 1}`;
    return {
      node: bus,
      terminalId,
      point: busTerminalCanvasPoint(bus, terminalId)
    };
  };

  const branchPairCounts = new Map();
  for (const branch of activeBranches) {
    const key = [branch[branchColumns.fromBus], branch[branchColumns.toBus]].sort((a, b) => a - b).join("-");
    branchPairCounts.set(key, (branchPairCounts.get(key) ?? 0) + 1);
  }
  const branchPairIndexes = new Map();

  activeBranches.forEach((branch, index) => {
    const fromBusNo = branch[branchColumns.fromBus];
    const toBusNo = branch[branchColumns.toBus];
    const fromBus = busByNo.get(fromBusNo);
    const toBus = busByNo.get(toBusNo);
    const fromNode = busNodes.get(fromBusNo);
    const toNode = busNodes.get(toBusNo);
    if (!fromBus || !toBus || !fromNode || !toNode) {
      return;
    }
    const pairKey = [fromBusNo, toBusNo].sort((a, b) => a - b).join("-");
    const pairIndex = branchPairIndexes.get(pairKey) ?? 0;
    branchPairIndexes.set(pairKey, pairIndex + 1);
    const pairCount = branchPairCounts.get(pairKey) ?? 1;
    const dx = toNode.position.x - fromNode.position.x;
    const dy = toNode.position.y - fromNode.position.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const normal = { x: -dy / length, y: dx / length };
    const parallelOffset = (pairIndex - (pairCount - 1) / 2) * 58;
    const midpoint = {
      x: round((fromNode.position.x + toNode.position.x) / 2 + normal.x * parallelOffset, 1),
      y: round((fromNode.position.y + toNode.position.y) / 2 + normal.y * parallelOffset, 1)
    };
    const transformer = shouldUseTransformer(branch, fromBus, toBus);
    const branchLayout = manualBranchLayout(manualLayout, fromBusNo, toBusNo);
    if (!transformer && manualLayout?.branches) {
      const fromEndpoint = takeBusEndpoint(fromBusNo);
      const toEndpoint = takeBusEndpoint(toBusNo);
      const routePoints = buildOrthogonalRoutePoints(
        { ...fromNode.position },
        { ...toNode.position },
        branchLayout?.via ?? []
      );
      const lineNode = makeRoutableLineNode({
        caseName: caseDef.modelName,
        id: `${caseDef.modelName.toLowerCase()}-line-${index + 1}`,
        name: `Line ${fromBusNo}-${toBusNo}`,
        routePoints,
        sourceNode: fromEndpoint.node,
        sourceTerminalId: fromEndpoint.terminalId,
        targetNode: toEndpoint.node,
        targetTerminalId: toEndpoint.terminalId,
        vbase: effectiveBaseKv(fromBus),
        params: baseElectricalParams({
          idx: String(index + 1),
          vbase: numericText(effectiveBaseKv(fromBus), 3),
          r: numericText(branch[branchColumns.r], 8),
          x: numericText(branch[branchColumns.x], 8),
          b: numericText(branch[branchColumns.b], 8)
        })
      });
      nodes.push(lineNode);
      return;
    }
    const devicePosition = branchLayout?.device ?? midpoint;
    const deviceRotation = branchLayout?.rotation ?? round((Math.atan2(dy, dx) * 180) / Math.PI, 2);
    const deviceNode = makeBaseNode({
      id: `${caseDef.modelName.toLowerCase()}-${transformer ? "xf" : "line"}-${index + 1}`,
      kind: transformer ? "ac-transformer" : "ac-line",
      name: `${transformer ? "Transformer" : "Line"} ${fromBusNo}-${toBusNo}`,
      position: devicePosition,
      size: transformer ? { width: 92, height: 70 } : { width: 108, height: 36 },
      rotation: deviceRotation,
      terminals: makeDeviceTerminals(caseDef.modelName, "ac", effectiveBaseKv(fromBus), 2),
      params: transformer
        ? baseElectricalParams({
            idx: String(index + 1),
            vbase: numericText(effectiveBaseKv(fromBus), 3),
            r: numericText(branch[branchColumns.r], 8),
            x: numericText(branch[branchColumns.x], 8),
            gt: "0",
            bt: numericText(branch[branchColumns.b], 8),
            tap: numericText(branch[branchColumns.tap] || 1, 8),
            shift: numericText(branch[branchColumns.shift] || 0, 8),
            voltageRatio: `${numericText(effectiveBaseKv(fromBus), 3)}/${numericText(effectiveBaseKv(toBus), 3)} kV`
          })
        : baseElectricalParams({
            idx: String(index + 1),
            vbase: numericText(effectiveBaseKv(fromBus), 3),
            r: numericText(branch[branchColumns.r], 8),
            x: numericText(branch[branchColumns.x], 8),
            b: numericText(branch[branchColumns.b], 8)
          })
    });
    nodes.push(deviceNode);
    const fromEndpoint = takeBusEndpoint(fromBusNo);
    const toEndpoint = takeBusEndpoint(toBusNo);
    const fromRoute = branchLayout?.fromVia
      ? buildOrthogonalRoutePoints(fromEndpoint.point, terminalPoint(deviceNode, "t1"), branchLayout.fromVia)
      : undefined;
    const toRoute = branchLayout?.toVia
      ? buildOrthogonalRoutePoints(terminalPoint(deviceNode, "t2"), toEndpoint.point, branchLayout.toVia)
      : undefined;
    addEdge(edges, `${deviceNode.id}-edge-a`, fromEndpoint.node, deviceNode, fromEndpoint.terminalId, "t1", fromEndpoint.point, undefined, fromRoute);
    addEdge(edges, `${deviceNode.id}-edge-b`, deviceNode, toEndpoint.node, "t2", toEndpoint.terminalId, undefined, toEndpoint.point, toRoute);
  });

  activeGens.forEach((gen, index) => {
    const busNo = gen[genColumns.busNo];
    const bus = busByNo.get(busNo);
    const busNode = busNodes.get(busNo);
    if (!bus || !busNode) {
      return;
    }
    const manualGenerator = manualLayout?.generators?.[busNo];
    const sameBusIndex = activeGens.slice(0, index).filter((item) => item[genColumns.busNo] === busNo).length;
    const node = makeBaseNode({
      id: `${caseDef.modelName.toLowerCase()}-gen-${index + 1}`,
      kind: "ac-source",
      name: `Gen ${index + 1} @ Bus ${busNo}`,
      position: manualGenerator
        ? { x: manualGenerator.x, y: manualGenerator.y }
        : {
        x: round(busNode.position.x - 132, 1),
        y: round(busNode.position.y - 42 + sameBusIndex * 72, 1)
      },
      size: { width: 84, height: 56 },
      terminals: makeDeviceTerminals(caseDef.modelName, "ac", effectiveBaseKv(bus), 1, manualGenerator?.anchor),
      params: baseElectricalParams({
        idx: String(index + 1),
        vbase: numericText(effectiveBaseKv(bus), 3),
        ratedVoltage: `${numericText(effectiveBaseKv(bus), 3)} kV`,
        ratedCapacity: `${numericText(Math.max(Math.abs(gen[genColumns.pg]), 1), 3)} MW`,
        controlType: bus[busColumns.type] === 3 ? "SLACK" : "PV",
        p_set: numericText(gen[genColumns.pg], 6),
        q_set: numericText(gen[genColumns.qg], 6),
        v_set: numericText((gen[genColumns.vg] || bus[busColumns.vm] || 1) * effectiveBaseKv(bus), 6),
        alpha: "1.0"
      })
    });
    nodes.push(node);
    const busEndpoint = takeBusEndpoint(busNo);
    addEdge(edges, `${node.id}-edge`, node, busEndpoint.node, "t1", busEndpoint.terminalId, undefined, busEndpoint.point);
  });

  parsed.bus.forEach((bus) => {
    const busNo = bus[busColumns.busNo];
    if (Math.abs(bus[busColumns.pd]) <= 1e-9 && Math.abs(bus[busColumns.qd]) <= 1e-9) {
      return;
    }
    const busNode = busNodes.get(busNo);
    if (!busNode) {
      return;
    }
    const manualLoad = manualLayout?.loads?.[busNo];
    const node = makeBaseNode({
      id: `${caseDef.modelName.toLowerCase()}-load-${busNo}`,
      kind: "ac-load",
      name: `Load @ Bus ${busNo}`,
      position: manualLoad
        ? { x: manualLoad.x, y: manualLoad.y }
        : {
        x: round(busNode.position.x + 124, 1),
        y: round(busNode.position.y + 74, 1)
      },
      size: { width: 86, height: 58 },
      terminals: makeLoadTerminal(caseDef.modelName, effectiveBaseKv(bus), manualLoad?.anchor),
      params: baseElectricalParams({
        idx: String(busNo),
        vbase: numericText(effectiveBaseKv(bus), 3),
        ratedActivePower: numericText(bus[busColumns.pd], 6),
        ratedReactivePower: numericText(bus[busColumns.qd], 6),
        pbase: numericText(bus[busColumns.pd], 6),
        qbase: numericText(bus[busColumns.qd], 6),
        pv0: "1.0",
        pv1: "0.0",
        pv2: "0.0",
        qv0: "1.0",
        qv1: "0.0",
        qv2: "0.0"
      })
    });
    nodes.push(node);
    const busEndpoint = takeBusEndpoint(busNo);
    addEdge(edges, `${node.id}-edge`, busEndpoint.node, node, busEndpoint.terminalId, "t1", busEndpoint.point, undefined);
  });

  const componentCounts = {
    ACRealBs: parsed.bus.length,
    ACBranch: activeBranches.filter((branch) => {
      const fromBus = busByNo.get(branch[branchColumns.fromBus]);
      const toBus = busByNo.get(branch[branchColumns.toBus]);
      return fromBus && toBus && !shouldUseTransformer(branch, fromBus, toBus);
    }).length,
    ACTransformer: activeBranches.filter((branch) => {
      const fromBus = busByNo.get(branch[branchColumns.fromBus]);
      const toBus = busByNo.get(branch[branchColumns.toBus]);
      return fromBus && toBus && shouldUseTransformer(branch, fromBus, toBus);
    }).length,
    ACGenerator: activeGens.length,
    ACLoad: parsed.bus.filter((bus) => Math.abs(bus[busColumns.pd]) > 1e-9 || Math.abs(bus[busColumns.qd]) > 1e-9).length
  };

  return {
    version: 1,
    name: caseDef.modelName,
    layers: [{ id: layerId, name: "默认图层", visible: true }],
    activeLayerId: layerId,
    canvasWidth: size.width,
    canvasHeight: size.height,
    allowAutoExpandCanvas: true,
    canvasBackgroundColor: "#f1f5f9",
    canvasBackgroundImage: "",
    canvasBackgroundImageAssetId: "",
    backgroundProjectId: "",
    backgroundLayerIds: [],
    powerUnit: "MW",
    voltageUnit: "kV",
    currentUnit: "A",
    powerBaseValue: parsed.baseMva,
    deviceIndexCounters: componentCounts,
    groups: [],
    measurements: { version: 1, groups: [] },
    nodes,
    edges
  };
}

async function fetchCase(caseDef) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(caseDef.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw new Error(`Failed to fetch ${caseDef.url}: ${lastError?.message ?? lastError}`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const summaries = [];
  for (const caseDef of cases) {
    const text = await fetchCase(caseDef);
    const parsed = parseMatpowerCase(text);
    const project = buildProject(caseDef, parsed);
    const filePath = path.join(outputDir, `${caseDef.modelName}.json`);
    await writeFile(filePath, `${JSON.stringify(project, null, 2)}\n`, "utf-8");
    summaries.push({
      model: caseDef.modelName,
      buses: parsed.bus.length,
      generators: activeGeneratorRows(parsed.gen).length,
      branches: activeBranchRows(parsed.branch).length,
      nodes: project.nodes.length,
      edges: project.edges.length,
      filePath
    });
  }
  for (const item of summaries) {
    console.log(`${item.model}: buses=${item.buses}, generators=${item.generators}, branches=${item.branches}, nodes=${item.nodes}, edges=${item.edges}`);
    console.log(`  ${item.filePath}`);
  }
}

await main();
