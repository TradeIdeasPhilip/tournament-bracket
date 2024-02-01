import { count, makePromise, sleep, zip } from "phil-lib/misc";
import "./style.css";
import { getById } from "phil-lib/client-misc";
import ffmpeg from "ffmpeg.js";

{
  let stdout = "";
  let stderr = "";
  ffmpeg({
    arguments: ["-version"],
    print: function (data) {
      stdout += data + "\n";
    },
    printErr: function (data) {
      stderr += data + "\n";
    },
    onExit: function (code) {
      console.log("Process exited with code " + code);
      console.log({ stdout, stderr });
    },
  });
}

const width = 1080;
const height = 1920;
const fontSize = 75;

const canvas = getById("main", HTMLCanvasElement);
canvas.width = width;
canvas.height = height;
const context = canvas.getContext("2d")!;
context.font = `${fontSize}px "Croissant One"`;
context.textAlign = "center";
context.textBaseline = "middle";
context.textRendering = "optimizeLegibility";
context.fillStyle = "white";
context.fillRect(0, 0, width, height);

const connectingLinesGElement = getById("connectingLines", SVGGElement);
const lettersGElement = getById("letters", SVGGElement);

const initialContents = [
  ["A", "Z", "Q", "B", "R", "T", "S", "D"],
  ["A", "B", "R", "D"],
  ["A", "D"],
  ["A"],
];
const currentIteration = initialContents.map((column) => column.map(() => 0));
const columnCount = initialContents.length;
const lineWidth = width / columnCount / 25;

const centers = initialContents.map((columnValues, columnIndex) => {
  const x = (width / columnCount) * (columnIndex + 0.5);
  return columnValues.map((_, rowIndex) => {
    const y = (height / columnValues.length) * (rowIndex + 0.5);
    const center = { x, y };
    return center;
  });
});

function getCenter(columnIndex: number, rowIndex: number, iteration = 0) {
  const { x, y } = centers[columnIndex][rowIndex];
  if (iteration > 1 && columnIndex == columnCount - 1) {
    {
      const howFarOver = 1;
      const howFarDown = iteration - howFarOver;
      return {
        x: x + howFarOver * fontSize,
        y: y + howFarDown * fontSize * 1.25,
      };
    }
  } else {
    return { x: x + iteration * fontSize, y };
  }
}

function drawBracket() {
  // Lines for the bracket.
  context.strokeStyle = "black";
  centers.forEach((column, columnIndex) => {
    const nextColumn = centers[columnIndex + 1];
    if (nextColumn) {
      column.forEach((initialPosition, initialRowIndex) => {
        const finalRowIndex = (initialRowIndex / 2) | 0;
        const finalPosition = nextColumn[finalRowIndex];
        // SVG
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );
        line.x1.baseVal.value = initialPosition.x;
        line.y1.baseVal.value = initialPosition.y;
        line.x2.baseVal.value = finalPosition.x;
        line.y2.baseVal.value = finalPosition.y;
        connectingLinesGElement.appendChild(line);
        // Canvas
        context.moveTo(initialPosition.x, initialPosition.y);
        context.lineTo(finalPosition.x, finalPosition.y);
        context.lineWidth = 10;
        context.stroke();
      });
    }
  });

  // Empty space to fill in later with the letters.
  context.fillStyle = "white";
  const radius = width / columnCount / 5;
  centers.flat().forEach(({ x, y }) => {
    // SVG
    const circleElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circleElement.cx.baseVal.value = x;
    circleElement.cy.baseVal.value = y;
    circleElement.r.baseVal.value = radius;
    circleElement.style.fill = "white";
    circleElement.style.stroke = "none";
    circleElement.style.strokeWidth = lineWidth + "px";
    connectingLinesGElement.appendChild(circleElement);
    // Canvas
    context.beginPath();
    context.ellipse(x, y, radius, radius, 0, 0, 2 * Math.PI);
    context.fill();
  });
}

function crossOut(center: { x: number; y: number }, color: string) {
  console.log({ crossOut: 1, center, color });
  const { x, y } = center;
  const length = fontSize;
  const width = fontSize / 9;
  const rectElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );
  rectElement.x.baseVal.value = -width / 2;
  rectElement.y.baseVal.value = -length / 2;
  rectElement.width.baseVal.value = width;
  rectElement.height.baseVal.value = length;
  rectElement.style.fill = color;
  rectElement.style.strokeWidth = (fontSize / 30).toString();
  rectElement.style.stroke = "white";
  rectElement.style.transform = `translate(${x}px,${y}px)  rotate(-45deg)`;
  lettersGElement.appendChild(rectElement);
  // Canvas
  const offset = fontSize * 0.4;
  context.beginPath();
  context.moveTo(x - offset, y - offset);
  context.lineTo(x + offset, y + offset);
  context.lineWidth = 12;
  context.strokeStyle = "white";
  context.stroke();
  context.lineWidth = 6.1;
  context.strokeStyle = color;
  context.stroke();
}

function addLetter(
  center: { x: number; y: number },
  text: string,
  color: string
) {
  console.log({ addLetter: 1, center, text, color });
  const textElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  textElement.textContent = text;
  textElement.setAttribute("x", center.x.toString());
  textElement.setAttribute("y", center.y.toString());
  textElement.style.fill = color;
  lettersGElement.appendChild(textElement);

  // canvas
  context.fillStyle = color;
  context.fillText(text, center.x, center.y);
}

type ReplaceOneCell = {
  rowIndex: number;
  newText?: string;
};

function takePhoto(timeMs?: number) {
  console.log(`takePhoto(${timeMs})`);
  const { promise, resolve } = makePromise();
  const continueButton = getById("continue", HTMLButtonElement);
  continueButton.disabled = false;
  continueButton.addEventListener(
    "click",
    () => {
      continueButton.disabled = true;
      resolve();
    },
    { once: true }
  );
  return promise;
}

/**
 *
 * @param cells Index 0 maps to the root of the tree.  Index 1 maps to one column left of the root.
 */
async function replaceOneValue(
  cells: readonly ReplaceOneCell[],
  color: string
) {
  let columnIndex = columnCount;
  const overWrite: {
    rowIndex: number;
    columnIndex: number;
    newText: string;
  }[] = [];
  for (const { rowIndex, newText } of cells) {
    columnIndex--;
    const iteration = currentIteration[columnIndex][rowIndex]++;
    crossOut(getCenter(columnIndex, rowIndex, iteration), color);
    if (newText) {
      overWrite.unshift({ rowIndex, columnIndex, newText });
    }
    await takePhoto(1000);
  }
  for (const { rowIndex, columnIndex, newText } of overWrite) {
    addLetter(
      getCenter(columnIndex, rowIndex, currentIteration[columnIndex][rowIndex]),
      newText,
      color
    );
    await takePhoto(1000);
  }
}

(window as any).replaceOneValue = replaceOneValue;

function drawInitialLetters(columnIndex: number) {
  for (const [center, text] of zip(
    centers[columnIndex],
    initialContents[columnIndex]
  )) {
    addLetter(center, text, "black");
  }
}

await sleep(1000);

drawInitialLetters(0);
await takePhoto();
drawBracket();
for (const columnIndex of count(0, columnCount)) {
  drawInitialLetters(columnIndex);
  await takePhoto();
}

await replaceOneValue(
  [
    { rowIndex: 0, newText: "B" },
    { rowIndex: 0, newText: "B" },
    { rowIndex: 0, newText: "Z" },
    { rowIndex: 0 },
  ],
  "hotpink"
);
await replaceOneValue(
  [
    { rowIndex: 0, newText: "D" },
    { rowIndex: 0, newText: "Q" },
    { rowIndex: 1, newText: "Q" },
    { rowIndex: 3 },
  ],
  "lightblue"
);

//ffmpeg({});
