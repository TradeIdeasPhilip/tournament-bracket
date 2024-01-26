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
const columnCount = initialContents.length;
const lineWidth = width / columnCount / 25;
const fontSize = 75;

const centers = initialContents.map((columnValues, columnIndex, everything) => {
  const x = (width / columnCount) * (columnIndex + 0.5);
  return columnValues.map((text, rowIndex) => {
    const y = (height / columnValues.length) * (rowIndex + 0.5);
    /*
    const circleElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circleElement.cx.baseVal.value = xCenter;
    circleElement.cy.baseVal.value = yCenter;
    circleElement.r.baseVal.value = width / columnCount / 4;
    circleElement.style.fill = "red";
    circleElement.style.stroke = "blue";
    circleElement.style.strokeWidth = (width / columnCount / 25).toString();
    svg.appendChild(circleElement);  
    */
    const textElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    textElement.textContent = text;
    textElement.setAttribute("x", x.toString());
    textElement.setAttribute("y", y.toString());
    lettersGElement.appendChild(textElement);
    return { x, y };
  });
});

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

function crossOut(
  columnIndex: number,
  rowIndex: number,
  color: string,
  //animationOptions: number | KeyframeAnimationOptions = 500
) {
  const { x, y } = centers[columnIndex][rowIndex];
  const offsetFromCenter = fontSize / 2;
  const lineElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );
  lineElement.x1.baseVal.value = offsetFromCenter;
  lineElement.y1.baseVal.value = 0;
  lineElement.x2.baseVal.value = -offsetFromCenter;
  lineElement.y2.baseVal.value = 0;
  lineElement.style.stroke = color;
  lineElement.style.transform = `translate(${x}px,${y}px)  rotate(-45deg)`;
  lineElement.style.strokeWidth = (fontSize / 10).toString();
  lineElement.style.strokeDasharray = fontSize.toString();
//  lineElement.style.filter="url(#shadow)";
  lettersGElement.appendChild(lineElement);
  /*
  if (animationOptions) {
    return lineElement.animate(
      [{ strokeDashoffset: fontSize }, { strokeDashoffset: 0 }],
      animationOptions
    ).finished;
  } else {
    return Promise.resolve();
  }*/
}

(window as any).crossOut = crossOut;
//for (let i = 3; i >= 0; i--) {await crossOut(i, 0, "red");}

for (let i = 3; i >= 0; i--) {/*await*/ crossOut(i, 0, "red"/*, {duration:250,easing:"ease-out"}*/);}