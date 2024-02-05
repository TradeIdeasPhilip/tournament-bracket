import "./style.css";
import { count, sleep, zip } from "phil-lib/misc";
import { getBlobFromCanvas, getById } from "phil-lib/client-misc";
import { downloadZip } from "client-zip";

/**
 *
 * @param date To convert to a string.
 * @returns Like the MySQL format, but avoids the colon because that's not valid in a file name.
 */
function dateToFileName(date: Date) {
  if (isNaN(date.getTime())) {
    return "0000-00-00 00⦂00⦂00";
  } else {
    return `${date.getFullYear().toString().padStart(4, "0")}-${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date
      .getHours()
      .toString()
      .padStart(2, "0")}⦂${date.getMinutes().toString().padStart(2, "0")}⦂${date
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;
  }
}

const width = 1080;
const height = 1920;
const fontSize = (75 / 1920) * height;
const backgroundColor = "white";

const canvas = getById("main", HTMLCanvasElement);
//const continueButton = getById("continue", HTMLButtonElement);
const downloadAnchor = getById("download", HTMLAnchorElement);

canvas.width = width;
canvas.height = height;
const context = canvas.getContext("2d")!;
context.font = `${fontSize}px "Croissant One"`;
context.textAlign = "center";
context.textBaseline = "middle";
context.textRendering = "optimizeLegibility";
context.fillStyle = backgroundColor;
context.fillRect(0, 0, width, height);

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
  context.strokeStyle = "#ccc";
  centers.forEach((column, columnIndex) => {
    const nextColumn = centers[columnIndex + 1];
    if (nextColumn) {
      column.forEach((initialPosition, initialRowIndex) => {
        const finalRowIndex = (initialRowIndex / 2) | 0;
        const finalPosition = nextColumn[finalRowIndex];
        context.moveTo(initialPosition.x, initialPosition.y);
        context.lineTo(finalPosition.x, finalPosition.y);
        context.lineWidth = 10;
        context.stroke();
      });
    }
  });

  // Empty space to fill in later with the letters.
  context.fillStyle = backgroundColor;
  const radius = width / columnCount / 5;
  centers.flat().forEach(({ x, y }) => {
    context.beginPath();
    context.ellipse(x, y, radius, radius, 0, 0, 2 * Math.PI);
    context.fill();
  });
}

function crossOut(center: { x: number; y: number }, color: string) {
  const { x, y } = center;
  const offset = fontSize * 0.4;
  context.beginPath();
  context.moveTo(x - offset, y - offset);
  context.lineTo(x + offset, y + offset);
  context.lineWidth = 12;
  context.strokeStyle = backgroundColor;
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
  context.fillStyle = color;
  context.fillText(text, center.x, center.y);
}

type ReplaceOneCell = {
  rowIndex: number;
  newText?: string;
};

const photos: Promise<Blob>[] = [];

function takePhoto() {
  /*
  const { promise, resolve } = makePromise();
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
*/
  photos.push(getBlobFromCanvas(canvas));
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
    await takePhoto();
  }
  for (const { rowIndex, columnIndex, newText } of overWrite) {
    addLetter(
      getCenter(columnIndex, rowIndex, currentIteration[columnIndex][rowIndex]),
      newText,
      color
    );
    await takePhoto();
  }
}

(window as any).replaceOneValue = replaceOneValue;

function drawInitialLetters(columnIndex: number) {
  for (const [center, text] of zip(
    centers[columnIndex],
    initialContents[columnIndex]
  )) {
    addLetter(center, text, "#666");
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
  "red"
);
await replaceOneValue(
  [
    { rowIndex: 0, newText: "D" },
    { rowIndex: 0, newText: "Q" },
    { rowIndex: 1, newText: "Q" },
    { rowIndex: 3 },
  ],
  "blue"
);

const baseDate = dateToFileName(new Date());
const input = (await Promise.all(photos)).map((blob, index) => ({
  name: `${baseDate} ${index.toString().padStart(4, "0")}.png`,
  lastModified: new Date(),
  input: blob,
}));
downloadAnchor.href = URL.createObjectURL(await downloadZip(input).blob());
downloadAnchor.download = "all_png_files.zip";
downloadAnchor.innerText = "Download";
