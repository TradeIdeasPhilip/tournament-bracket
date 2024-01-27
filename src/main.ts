import "./style.css";
import { getById } from "phil-lib/client-misc";

const svg = getById("main", SVGSVGElement);
const width = 1080;
const height = 1920;

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
const fontSize = 75;

const centers = initialContents.map((columnValues, columnIndex) => {
  const x = (width / columnCount) * (columnIndex + 0.5);
  return columnValues.map((text, rowIndex) => {
    const y = (height / columnValues.length) * (rowIndex + 0.5);
    const center = { x, y };
    addLetter(center, text, "black");
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

centers.forEach((column, columnIndex) => {
  const nextColumn = centers[columnIndex + 1];
  if (nextColumn) {
    column.forEach((initialPosition, initialRowIndex) => {
      const finalRowIndex = (initialRowIndex / 2) | 0;
      const finalPosition = nextColumn[finalRowIndex];
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.x1.baseVal.value = initialPosition.x;
      line.y1.baseVal.value = initialPosition.y;
      line.x2.baseVal.value = finalPosition.x;
      line.y2.baseVal.value = finalPosition.y;
      connectingLinesGElement.appendChild(line);
    });
  }
});

centers.flat().forEach(({ x, y }) => {
  const circleElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  circleElement.cx.baseVal.value = x;
  circleElement.cy.baseVal.value = y;
  circleElement.r.baseVal.value = width / columnCount / 4;
  circleElement.style.fill = "white";
  circleElement.style.stroke = "none";
  circleElement.style.strokeWidth = lineWidth + "px";
  connectingLinesGElement.appendChild(circleElement);
});

function crossOut(center: { x: number; y: number }, color: string) {
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
}

//(window as any).crossOut = crossOut;
//for (let i = 3; i >= 0; i--) {await crossOut(i, 0, "red");}

/*
for (let i = 3; i >= 0; i--) {
  crossOut(getCenter(i, 0), "red");
}
*/

function addLetter(
  center: { x: number; y: number },
  text: string,
  color: string
) {
  const textElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  textElement.textContent = text;
  textElement.setAttribute("x", center.x.toString());
  textElement.setAttribute("y", center.y.toString());
  textElement.style.fill = color;
  lettersGElement.appendChild(textElement);
}

/**
 * This function is great for quick prototyping and development.
 * However, it will probably get split up soon.
 * The animation will start by crossing out the value at the root.
 * Then it will cross out the value of one of root's children.
 * And it will keep moving left and crossing out values.
 * Then it will fill in the new values going in the other direction.
 * @param columnIndex
 * @param rowIndex
 * @param text
 * @param color
 */
function replace(
  columnIndex: number,
  rowIndex: number,
  text: string,
  color: string
) {
  const newIteration = ++currentIteration[columnIndex][rowIndex];
  crossOut(getCenter(columnIndex, rowIndex, newIteration - 1), color);
  addLetter(getCenter(columnIndex, rowIndex, newIteration), text, color);
}

(window as any).replace = replace;
