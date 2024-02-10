import "./style.css";
import { assertClass, count, makePromise, sleep, zip } from "phil-lib/misc";
import { getBlobFromCanvas, getById } from "phil-lib/client-misc";

/**
 *
 * @param date To convert to a string.
 * @returns Like the MySQL format, but avoids the colon because that's not valid in a file name.
 */
function dateToFileName(date: Date) {
  if (isNaN(date.getTime())) {
    return "0000⸱00⸱00 00⦂00⦂00";
  } else {
    return `${date.getFullYear().toString().padStart(4, "0")}⸱${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}⸱${date.getDate().toString().padStart(2, "0")} ${date
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
const initialLetterColor = "#666";

const canvas = getById("main", HTMLCanvasElement);
const startButton = getById("start", HTMLButtonElement);
const voiceoverControl = getById("voiceover", HTMLAudioElement);

canvas.width = width;
canvas.height = height;
const context = canvas.getContext("2d")!;
const setFontSize = (newValue = fontSize) => {
  context.font = `${newValue}px "Croissant One"`;
};
setFontSize();
context.textAlign = "center";
context.textBaseline = "middle";
context.textRendering = "optimizeLegibility";
context.fillStyle = backgroundColor;
context.fillRect(0, 0, width, height);

const initialContents = [
  ["Z", "A", "Q", "B", "R", "T", "S", "D"],
  ["A", "B", "R", "D"],
  ["A", "D"],
  ["A"],
];
const currentIteration = initialContents.map((column) => column.map(() => 0));
const columnCount = initialContents.length;

const reservedOnTop = 1;
const clientTop =
  (reservedOnTop / (reservedOnTop + initialContents[0].length)) * height;
const clientHeight = height - clientTop;
const centers = initialContents.map((columnValues, columnIndex) => {
  const x = (width / columnCount) * (columnIndex + 0.5);
  return columnValues.map((_, rowIndex) => {
    const y =
      clientTop + (clientHeight / columnValues.length) * (rowIndex + 0.5);
    const center = { x, y };
    return center;
  });
});

function drawFinalResult(text: string, columnIndex: number, color: string) {
  const x = (width / initialContents[0].length) * (columnIndex + 0.5);
  const y = clientTop / 2;

  context.fillStyle = backgroundColor;
  context.fillRect(
    x - fontSize * 0.6,
    y - fontSize * 0.6,
    fontSize * 1.2,
    fontSize * 1.1
  );
  context.fillStyle = color;
  context.fillText(text, x, y);

  const ordinalLeft = (columnIndex + 1).toString();
  const ordinalRight = ["st", "nd", "rd"][columnIndex] ?? "th";
  const sizeLeft = fontSize * 0.667;
  const sizeRight = fontSize * 0.42;
  setFontSize(sizeLeft);
  const metricsLeft = context.measureText(ordinalLeft);
  setFontSize(sizeRight);
  const metricsRight = context.measureText(ordinalRight);
  const ordinalWidth = metricsLeft.width + metricsRight.width;
  const ordinalFarLeft = x - ordinalWidth / 2;
  const ordinalLeftX = ordinalFarLeft + metricsLeft.width / 2;
  const ordinalRightX = ordinalLeftX + ordinalWidth / 2;

  setFontSize(sizeLeft);
  context.fillText(ordinalLeft, ordinalLeftX, y + fontSize);

  setFontSize(sizeRight);
  context.fillText(ordinalRight, ordinalRightX, y + fontSize * 0.9);

  setFontSize();
}

// [...initialContents[0]].sort().forEach((text, columnIndex) => {
//   const color =
//     [initialLetterColor, "red", "blue", "green", "#CC5500", "#800080", "lime"][
//       columnIndex
//     ] ?? "black";
//   drawFinalResult(text, columnIndex, color);
// });

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

const controls = {
  saveFrames: false,
  /**
   * speed = slowness⁻¹
   */
  slowness: 0,
};

const millisecondsPerFrame = 1000 / 60;
let nextImageIndex = 0;
function skipFrames(frameCount: number) {
  if (frameCount < 0) {
    throw new Error("wtf");
  }
  nextImageIndex += frameCount | 0;
  if (controls.slowness) {
    const desiredWakeTimeMs = nextImageIndex * millisecondsPerFrame;
    const currentTimeMs = voiceoverControl.currentTime * 1000;
    return sleep((desiredWakeTimeMs - currentTimeMs) * controls.slowness);
  } else {
    return Promise.resolve();
  }
}
function skipToMs(timeFromStartInMs: number) {
  return skipFrames(framesUntilTime(timeFromStartInMs));
}
function framesUntilTime(timeFromStartInMs: number) {
  const finalFrame = (timeFromStartInMs / millisecondsPerFrame) | 0;
  const remaining = finalFrame - nextImageIndex;
  if (remaining < 0) {
    throw new Error("wtf");
  }
  return remaining;
}

let baseDate = dateToFileName(new Date());
const downloadAnchor = document.createElement("a");
async function takePhoto() {
  if (controls.saveFrames) {
    downloadAnchor.download = `${baseDate} ${(nextImageIndex++)
      .toString()
      .padStart(4, "0")}.png`;
    const blob = await getBlobFromCanvas(canvas);
    const url = URL.createObjectURL(blob);
    downloadAnchor.href = url;
    downloadAnchor.click();
    URL.revokeObjectURL(url);
  }
  if (controls.slowness) {
    await sleep(millisecondsPerFrame * controls.slowness);
  }
}

function makePhotoTimer(
  startMs: number,
  endMs: number,
  count: number,
  pause: "start" | "end" | "both" | "neither"
) {
  const pauseBefore = pause == "start" || pause == "both";
  const pauseAfter = pause == "end" || pause == "both";
  const pauses = (() => {
    let pauses = count - 1;
    if (pauseBefore) pauses++;
    if (pauseAfter) pauses++;
    return pauses;
  })();
  const pauseMs = (endMs - startMs) / pauses;
  const firstMs = startMs + (pauseBefore ? pauseMs : 0);
  let photosTaken = 0;
  async function takeNextPhoto() {
    if (photosTaken >= count) {
      throw new Error("wtf");
    }
    const time = firstMs + pauseMs * photosTaken;
    await skipToMs(time);
    await takePhoto();
    photosTaken++;
  }
  return takeNextPhoto;
}

/**
 *
 * @param cells Index 0 maps to the root of the tree.  Index 1 maps to one column left of the root.
 */
async function replaceOneValue(
  cells: readonly ReplaceOneCell[],
  color: string,
  topRowPosition: number,
  startTime: number,
  midTime: number,
  endTime: number
) {
  let takeNextPhoto = makePhotoTimer(startTime, midTime, cells.length, "end");
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
    await takeNextPhoto();
  }
  takeNextPhoto = makePhotoTimer(midTime, endTime, overWrite.length, "end");
  for (const { rowIndex, columnIndex, newText } of overWrite) {
    addLetter(
      getCenter(columnIndex, rowIndex, currentIteration[columnIndex][rowIndex]),
      newText,
      color
    );
    await takeNextPhoto();
  }
  const { newText } = cells[0];
  if (newText) {
    drawFinalResult(newText, topRowPosition, color);
    await skipFrames(500 / millisecondsPerFrame);
  }
}

function drawInitialLetters(columnIndex: number) {
  for (const [center, text] of zip(
    centers[columnIndex],
    initialContents[columnIndex]
  )) {
    addLetter(center, text, initialLetterColor);
  }
}

{
  const promise = makePromise();
  startButton.addEventListener(
    "click",
    () => {
      baseDate = dateToFileName(new Date());
      document.querySelectorAll("input").forEach((inputElement) => {
        if (inputElement.type != "radio" || !inputElement.checked)
          inputElement.disabled = true;
      });
      startButton.disabled = true;
      promise.resolve();
    },
    { once: true }
  );
  await promise.promise;
}

controls.saveFrames = getById("saveFrames", HTMLInputElement).checked;

{
  const asString = assertClass(
    document.querySelector('[name="speed"]:checked'),
    HTMLElement
  ).dataset.slowness;
  if (asString === undefined) {
    throw new Error("wtf");
  }
  controls.slowness = +asString;
}

if (controls.slowness) {
  voiceoverControl.playbackRate = 1 / controls.slowness;
  voiceoverControl.play();
}

{
  // ❝You know how to find the best item in a list❞
  drawInitialLetters(0);
  await takePhoto();
  await skipToMs(2200);
  drawFinalResult("??", 0, initialLetterColor);
  await skipToMs(3750);
}

{
  // ❝That's just a standard tournament bracket.❞
  const startTime = 3750;
  const endTime = 6500;
  await skipToMs(startTime);
  const takeNextPhoto = makePhotoTimer(
    startTime,
    endTime,
    columnCount + 1,
    "both"
  );
  async (n: number) => {
    const denominator = columnCount + 2;
    const pausePerPhoto = (endTime - startTime) / denominator;
    await skipToMs(startTime + (n + 1) * pausePerPhoto);
    takePhoto();
  };
  drawBracket();
  for (const columnIndex of count(0, columnCount)) {
    drawInitialLetters(columnIndex);
    await takeNextPhoto();
  }
  drawFinalResult(initialContents[columnCount - 1][0], 0, initialLetterColor);
  await takeNextPhoto();
  await skipToMs(endTime);
}

{
  // ❝But what about second place?❞
  await skipToMs(8000);
  drawFinalResult("??", 1, "red");
}

// ❝Don't start from scratch❞

{
  // ❝Remove the winner❞
  // ❝Then fill in the missing holes.❞
  await replaceOneValue(
    [
      { rowIndex: 0, newText: "B" },
      { rowIndex: 0, newText: "B" },
      { rowIndex: 0, newText: "Z" },
      { rowIndex: 1 },
    ],
    "red",
    1,
    12000,
    13750,
    16500
  );
}

{
  await replaceOneValue(
    [
      { rowIndex: 0, newText: "D" },
      { rowIndex: 0, newText: "Q" },
      { rowIndex: 1, newText: "Q" },
      { rowIndex: 3 },
    ],
    "blue",
    2,
    16500,
    16500 + 1750,
    16500 + 4500
  );
}
console.log(
  `Total run time:  ${(
    nextImageIndex * millisecondsPerFrame
  ).toLocaleString()} ms.`
);
