"use client";
import type { PointerEvent, PointerEventHandler } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const cellSize = 42;
const cellGap = 4;
const cellStep = cellSize + cellGap;

const stageWidth = 760;
const stageHeight = 640;

const boardColumnCount = 7;
const boardRowCount = 7;
const boardWidth =
  boardColumnCount * cellSize + (boardColumnCount - 1) * cellGap;
const boardHeight = boardRowCount * cellSize + (boardRowCount - 1) * cellGap;
const boardLeft = Math.round((stageWidth - boardWidth) / 2);
const boardTop = 138;

const pieceIds = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type PieceId = (typeof pieceIds)[number];

type Matrix = number[][];

type Point = { x: number; y: number };

type CellCoordinate = { rowIndex: number; columnIndex: number };

type TabletopLocation = { type: "tabletop"; x: number; y: number };

type BoardLocation = { type: "board"; rowIndex: number; columnIndex: number };

type PieceLocation = TabletopLocation | BoardLocation;

type PieceDefinition = { color: string; home: Point; matrix: Matrix };

type PieceState = {
  pieceId: PieceId;
  matrix: Matrix;
  color: string;
  location: PieceLocation;
  zIndex: number;
};

type DragState = { pieceId: PieceId; offsetX: number; offsetY: number };

type BoardCell = { label: string | null; type: "month" | "day" | "absent" };

type PuzzleDate = { monthIndex: number; day: number };

type OccupiedBoardCell = {
  pieceId: PieceId;
  rowIndex: number;
  columnIndex: number;
};

type ValidationIssue =
  | { type: "outside-board"; cell: CellCoordinate }
  | { type: "covers-target-date"; cell: CellCoordinate }
  | { type: "overlap"; cell: CellCoordinate; coveringPieceIds: PieceId[] };

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
] as const;

const boardCells: BoardCell[][] = [
  [
    { label: "Jan", type: "month" },
    { label: "Feb", type: "month" },
    { label: "Mar", type: "month" },
    { label: "Apr", type: "month" },
    { label: "Mai", type: "month" },
    { label: "Jun", type: "month" },
    { label: null, type: "absent" },
  ],
  [
    { label: "Jul", type: "month" },
    { label: "Aug", type: "month" },
    { label: "Sep", type: "month" },
    { label: "Okt", type: "month" },
    { label: "Nov", type: "month" },
    { label: "Dez", type: "month" },
    { label: null, type: "absent" },
  ],
  [
    { label: "1", type: "day" },
    { label: "2", type: "day" },
    { label: "3", type: "day" },
    { label: "4", type: "day" },
    { label: "5", type: "day" },
    { label: "6", type: "day" },
    { label: "7", type: "day" },
  ],
  [
    { label: "8", type: "day" },
    { label: "9", type: "day" },
    { label: "10", type: "day" },
    { label: "11", type: "day" },
    { label: "12", type: "day" },
    { label: "13", type: "day" },
    { label: "14", type: "day" },
  ],
  [
    { label: "15", type: "day" },
    { label: "16", type: "day" },
    { label: "17", type: "day" },
    { label: "18", type: "day" },
    { label: "19", type: "day" },
    { label: "20", type: "day" },
    { label: "21", type: "day" },
  ],
  [
    { label: "22", type: "day" },
    { label: "23", type: "day" },
    { label: "24", type: "day" },
    { label: "25", type: "day" },
    { label: "26", type: "day" },
    { label: "27", type: "day" },
    { label: "28", type: "day" },
  ],
  [
    { label: "29", type: "day" },
    { label: "30", type: "day" },
    { label: "31", type: "day" },
    { label: null, type: "absent" },
    { label: null, type: "absent" },
    { label: null, type: "absent" },
    { label: null, type: "absent" },
  ],
];

const pieceDefinitions = {
  A: {
    color: "#c4e3ec",
    home: { x: 64, y: 64 },
    matrix: [
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 1],
    ],
  },
  B: {
    color: "#5c9fb0",
    home: { x: 606, y: 154 },
    matrix: [
      [1, 1],
      [1, 0],
      [1, 1],
    ],
  },
  C: {
    color: "#b1d6dc",
    home: { x: 526, y: 52 },
    matrix: [
      [1, 1, 1, 0],
      [0, 0, 1, 1],
    ],
  },
  D: {
    color: "#98c5cb",
    home: { x: 560, y: 472 },
    matrix: [
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  E: {
    color: "#cbeaf0",
    home: { x: 72, y: 330 },
    matrix: [
      [1, 1],
      [1, 1],
      [0, 1],
    ],
  },
  F: {
    color: "#b0d8dd",
    home: { x: 170, y: 474 },
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [1, 0, 0],
    ],
  },
  G: {
    color: "#a7d3d8",
    home: { x: 50, y: 186 },
    matrix: [
      [1, 1],
      [1, 1],
      [1, 1],
    ],
  },
  H: {
    color: "#7dafbe",
    home: { x: 600, y: 312 },
    matrix: [
      [1, 1, 1, 1],
      [0, 1, 0, 0],
    ],
  },
} satisfies Record<PieceId, PieceDefinition>;

function getTodayPuzzleDate(): PuzzleDate {
  const today = new Date();

  return { monthIndex: today.getMonth(), day: today.getDate() };
}

function shiftPuzzleDate(
  puzzleDate: PuzzleDate,
  dayOffset: number,
): PuzzleDate {
  const shiftedDate = new Date(2026, puzzleDate.monthIndex, puzzleDate.day);
  shiftedDate.setDate(shiftedDate.getDate() + dayOffset);

  return { monthIndex: shiftedDate.getMonth(), day: shiftedDate.getDate() };
}

function getPuzzleDateLabel(puzzleDate: PuzzleDate) {
  return `${monthLabels[puzzleDate.monthIndex]} ${puzzleDate.day}`;
}

function getTargetMonthLabel(puzzleDate: PuzzleDate) {
  return monthLabels[puzzleDate.monthIndex];
}

function getTargetDayLabel(puzzleDate: PuzzleDate) {
  return String(puzzleDate.day);
}

function normalizeMatrix(matrix: Matrix): Matrix {
  const occupiedRows = matrix
    .map((row, rowIndex) => (row.some(Boolean) ? rowIndex : null))
    .filter((rowIndex): rowIndex is number => rowIndex !== null);

  const columnCount = matrix.reduce(
    (currentMaximum, row) => Math.max(currentMaximum, row.length),
    0,
  );

  const occupiedColumns = Array.from(
    { length: columnCount },
    (_, columnIndex) =>
      matrix.some((row) => Boolean(row[columnIndex])) ? columnIndex : null,
  ).filter((columnIndex): columnIndex is number => columnIndex !== null);

  if (occupiedRows.length === 0 || occupiedColumns.length === 0) {
    return [];
  }

  const firstRow = Math.min(...occupiedRows);
  const lastRow = Math.max(...occupiedRows);
  const firstColumn = Math.min(...occupiedColumns);
  const lastColumn = Math.max(...occupiedColumns);

  return matrix
    .slice(firstRow, lastRow + 1)
    .map((row) => row.slice(firstColumn, lastColumn + 1));
}

function rotateMatrixClockwise(matrix: Matrix): Matrix {
  const rowCount = matrix.length;
  const columnCount = matrix[0]?.length ?? 0;

  const rotatedMatrix = Array.from(
    { length: columnCount },
    (_rowIterable, rowIndex) =>
      Array.from({ length: rowCount }, (_columnIterable, columnIndex) =>
        Number(Boolean(matrix[rowCount - 1 - columnIndex]?.[rowIndex])),
      ),
  );

  return normalizeMatrix(rotatedMatrix);
}

function flipMatrixHorizontally(matrix: Matrix): Matrix {
  return normalizeMatrix(matrix.map((row) => [...row].reverse()));
}

function forEachOccupiedMatrixCell(
  matrix: Matrix,
  callback: (rowIndex: number, columnIndex: number) => void,
) {
  matrix.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value) {
        callback(rowIndex, columnIndex);
      }
    });
  });
}

function getPieceDimensions(matrix: Matrix) {
  const rowCount = matrix.length;
  const columnCount = matrix[0]?.length ?? 0;

  return {
    width: columnCount * cellSize + Math.max(0, columnCount - 1) * cellGap,
    height: rowCount * cellSize + Math.max(0, rowCount - 1) * cellGap,
  };
}

function getBoardCellKey(rowIndex: number, columnIndex: number) {
  return `${rowIndex}:${columnIndex}`;
}

function getBoardCell(rowIndex: number, columnIndex: number) {
  return boardCells[rowIndex]?.[columnIndex] ?? null;
}

function isValidBoardCell(rowIndex: number, columnIndex: number) {
  return getBoardCell(rowIndex, columnIndex)?.label !== null;
}

function isTargetDateCell(
  rowIndex: number,
  columnIndex: number,
  puzzleDate: PuzzleDate,
) {
  const boardCell = getBoardCell(rowIndex, columnIndex);

  if (!boardCell?.label) {
    return false;
  }

  if (boardCell.type === "month") {
    return boardCell.label === getTargetMonthLabel(puzzleDate);
  }

  if (boardCell.type === "day") {
    return boardCell.label === getTargetDayLabel(puzzleDate);
  }

  return false;
}

function getBoardCellPosition(rowIndex: number, columnIndex: number): Point {
  return {
    x: boardLeft + columnIndex * cellStep,
    y: boardTop + rowIndex * cellStep,
  };
}

function getRequiredBoardCellKeys(puzzleDate: PuzzleDate) {
  const requiredBoardCellKeys = new Set<string>();

  boardCells.forEach((row, rowIndex) => {
    row.forEach((boardCell, columnIndex) => {
      if (
        boardCell.label &&
        !isTargetDateCell(rowIndex, columnIndex, puzzleDate)
      ) {
        requiredBoardCellKeys.add(getBoardCellKey(rowIndex, columnIndex));
      }
    });
  });

  return requiredBoardCellKeys;
}

function createInitialPieces(): Record<PieceId, PieceState> {
  return Object.fromEntries(
    pieceIds.map((pieceId, pieceIndex) => {
      const definition = pieceDefinitions[pieceId];

      return [
        pieceId,
        {
          pieceId,
          matrix: definition.matrix,
          color: definition.color,
          location: {
            type: "tabletop",
            x: definition.home.x,
            y: definition.home.y,
          },
          zIndex: 20 + pieceIndex,
        },
      ];
    }),
  ) as Record<PieceId, PieceState>;
}

function getPieceTopLeft(piece: PieceState): Point {
  if (piece.location.type === "board") {
    return getBoardCellPosition(
      piece.location.rowIndex,
      piece.location.columnIndex,
    );
  }

  return { x: piece.location.x, y: piece.location.y };
}

function getSnappedBoardLocation(
  left: number,
  top: number,
  matrix: Matrix,
): BoardLocation | null {
  const dimensions = getPieceDimensions(matrix);

  const pieceRectangle = {
    left,
    top,
    right: left + dimensions.width,
    bottom: top + dimensions.height,
  };

  const snapRectangle = {
    left: boardLeft - cellStep * 1.5,
    top: boardTop - cellStep * 1.5,
    right: boardLeft + boardWidth + cellStep * 1.5,
    bottom: boardTop + boardHeight + cellStep * 1.5,
  };

  const intersectsBoardSnapArea =
    pieceRectangle.right >= snapRectangle.left &&
    pieceRectangle.left <= snapRectangle.right &&
    pieceRectangle.bottom >= snapRectangle.top &&
    pieceRectangle.top <= snapRectangle.bottom;

  if (!intersectsBoardSnapArea) {
    return null;
  }

  return {
    type: "board",
    rowIndex: Math.round((top - boardTop) / cellStep),
    columnIndex: Math.round((left - boardLeft) / cellStep),
  };
}

function getPieceOccupiedBoardCells(piece: PieceState): OccupiedBoardCell[] {
  const { location } = piece;

  if (location.type !== "board") {
    return [];
  }

  const occupiedBoardCells: OccupiedBoardCell[] = [];

  forEachOccupiedMatrixCell(
    piece.matrix,
    (matrixRowIndex, matrixColumnIndex) => {
      occupiedBoardCells.push({
        pieceId: piece.pieceId,
        rowIndex: location.rowIndex + matrixRowIndex,
        columnIndex: location.columnIndex + matrixColumnIndex,
      });
    },
  );

  return occupiedBoardCells;
}

function derivePuzzleState(
  pieces: Record<PieceId, PieceState>,
  puzzleDate: PuzzleDate,
) {
  const invalidPieceIds = new Set<PieceId>();
  const boardCellCoverage = new Map<string, PieceId[]>();

  Object.values(pieces).forEach((piece) => {
    getPieceOccupiedBoardCells(piece).forEach((cell) => {
      const cellKey = getBoardCellKey(cell.rowIndex, cell.columnIndex);

      if (!isValidBoardCell(cell.rowIndex, cell.columnIndex)) {
        invalidPieceIds.add(piece.pieceId);
      }

      if (isTargetDateCell(cell.rowIndex, cell.columnIndex, puzzleDate)) {
        invalidPieceIds.add(piece.pieceId);
      }

      const currentCoverage = boardCellCoverage.get(cellKey) ?? [];
      boardCellCoverage.set(cellKey, [...currentCoverage, piece.pieceId]);
    });
  });

  boardCellCoverage.forEach((coveringPieceIds) => {
    if (coveringPieceIds.length > 1) {
      coveringPieceIds.forEach((pieceId) => invalidPieceIds.add(pieceId));
    }
  });

  const requiredBoardCellKeys = getRequiredBoardCellKeys(puzzleDate);
  const allPiecesAreOnBoard = Object.values(pieces).every(
    (piece) => piece.location.type === "board",
  );

  const allRequiredCellsCovered = [...requiredBoardCellKeys].every(
    (cellKey) => (boardCellCoverage.get(cellKey) ?? []).length === 1,
  );

  const noExtraCellsCovered = [...boardCellCoverage.keys()].every((cellKey) =>
    requiredBoardCellKeys.has(cellKey),
  );

  const debugIssues = Object.fromEntries(
    Object.values(pieces).map((piece) => {
      const issues: ValidationIssue[] = [];

      getPieceOccupiedBoardCells(piece).forEach((cell) => {
        const cellKey = getBoardCellKey(cell.rowIndex, cell.columnIndex);
        const coveringPieceIds = boardCellCoverage.get(cellKey) ?? [];

        if (!isValidBoardCell(cell.rowIndex, cell.columnIndex)) {
          issues.push({ type: "outside-board", cell });
        }

        if (isTargetDateCell(cell.rowIndex, cell.columnIndex, puzzleDate)) {
          issues.push({ type: "covers-target-date", cell });
        }

        if (coveringPieceIds.length > 1) {
          issues.push({ type: "overlap", cell, coveringPieceIds });
        }
      });

      return [piece.pieceId, issues];
    }),
  ) as Record<PieceId, ValidationIssue[]>;

  return {
    boardCellCoverage,
    debugIssues,
    invalidPieceIds,
    isSolved:
      allPiecesAreOnBoard &&
      invalidPieceIds.size === 0 &&
      allRequiredCellsCovered &&
      noExtraCellsCovered,
  };
}

type PuzzlePieceProps = {
  piece: PieceState;
  isDragging: boolean;
  isInvalid: boolean;
  isSelected: boolean;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
};

function PuzzlePiece({
  piece,
  isDragging,
  isInvalid,
  isSelected,
  onPointerDown,
}: Readonly<PuzzlePieceProps>) {
  const topLeft = getPieceTopLeft(piece);
  const dimensions = getPieceDimensions(piece.matrix);

  const occupiedCells: CellCoordinate[] = [];

  forEachOccupiedMatrixCell(piece.matrix, (rowIndex, columnIndex) => {
    occupiedCells.push({ rowIndex, columnIndex });
  });

  const centroid = occupiedCells.reduce(
    (currentCentroid, cell) => ({
      x: currentCentroid.x + cell.columnIndex * cellStep + cellSize / 2,
      y: currentCentroid.y + cell.rowIndex * cellStep + cellSize / 2,
    }),
    { x: 0, y: 0 },
  );

  const labelPosition = {
    x: occupiedCells.length > 0 ? centroid.x / occupiedCells.length : 0,
    y: occupiedCells.length > 0 ? centroid.y / occupiedCells.length : 0,
  };

  const borderColor = isInvalid
    ? "rgba(146, 64, 14, 0.95)"
    : "rgba(27, 52, 62, 0.72)";
  const borderStyle = isInvalid ? "dashed" : "solid";

  return (
    <div
      className="absolute cursor-grab touch-none select-none active:cursor-grabbing"
      style={{
        left: topLeft.x,
        top: topLeft.y,
        width: dimensions.width,
        height: dimensions.height,
        zIndex: piece.zIndex,
        opacity: isDragging ? 0.9 : 1,
        filter: isSelected
          ? "drop-shadow(0 12px 16px rgba(15, 23, 42, 0.32))"
          : "drop-shadow(0 6px 8px rgba(15, 23, 42, 0.22))",
      }}
      onPointerDown={onPointerDown}
    >
      {occupiedCells.map(({ rowIndex, columnIndex }) => {
        const hasRightNeighbor = Boolean(
          piece.matrix[rowIndex]?.[columnIndex + 1],
        );
        const hasBottomNeighbor = Boolean(
          piece.matrix[rowIndex + 1]?.[columnIndex],
        );
        const hasBottomRightNeighbor = Boolean(
          piece.matrix[rowIndex + 1]?.[columnIndex + 1],
        );

        return (
          <div key={`${rowIndex}:${columnIndex}`}>
            <div
              className="absolute rounded-md"
              style={{
                left: columnIndex * cellStep,
                top: rowIndex * cellStep,
                width: cellSize,
                height: cellSize,
                background: piece.color,
                border: `2px ${borderStyle} ${borderColor}`,
                boxShadow: isSelected
                  ? "inset 0 1px 0 rgba(255,255,255,.55), 0 0 0 3px rgba(255,255,255,.35)"
                  : "inset 0 1px 0 rgba(255,255,255,.45)",
              }}
            />

            {hasRightNeighbor ? (
              <div
                className="absolute"
                style={{
                  left: columnIndex * cellStep + cellSize - 1,
                  top: rowIndex * cellStep + 3,
                  width: cellGap + 2,
                  height: cellSize - 6,
                  background: piece.color,
                }}
              />
            ) : null}

            {hasBottomNeighbor ? (
              <div
                className="absolute"
                style={{
                  left: columnIndex * cellStep + 3,
                  top: rowIndex * cellStep + cellSize - 1,
                  width: cellSize - 6,
                  height: cellGap + 2,
                  background: piece.color,
                }}
              />
            ) : null}

            {hasRightNeighbor && hasBottomNeighbor && hasBottomRightNeighbor ? (
              <div
                className="absolute"
                style={{
                  left: columnIndex * cellStep + cellSize - 1,
                  top: rowIndex * cellStep + cellSize - 1,
                  width: cellGap + 2,
                  height: cellGap + 2,
                  background: piece.color,
                }}
              />
            ) : null}
          </div>
        );
      })}

      <div
        className="pointer-events-none absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/55 text-sm font-black text-slate-900/75 [text-shadow:0_1px_1px_rgba(255,255,255,0.5)]"
        style={{ left: labelPosition.x, top: labelPosition.y }}
      >
        {piece.pieceId}
      </div>
    </div>
  );
}

function Artifact() {
  const scalerElementRef = useRef<HTMLDivElement | null>(null);
  const stageElementRef = useRef<HTMLDivElement | null>(null);

  const [stageScale, setStageScale] = useState(1);
  const [puzzleDate, setPuzzleDate] = useState<PuzzleDate>(() =>
    getTodayPuzzleDate(),
  );
  const [pieces, setPieces] = useState<Record<PieceId, PieceState>>(() =>
    createInitialPieces(),
  );
  const [selectedPieceId, setSelectedPieceId] = useState<PieceId | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSolvedModalOpen, setIsSolvedModalOpen] = useState(false);
  const wasSolvedRef = useRef(false);

  const derivedPuzzleState = useMemo(
    () => derivePuzzleState(pieces, puzzleDate),
    [pieces, puzzleDate],
  );

  useEffect(() => {
    const invalidIssueSummary = Object.fromEntries(
      Object.entries(derivedPuzzleState.debugIssues).filter(
        ([, issues]) => issues.length > 0,
      ),
    );

    if (Object.keys(invalidIssueSummary).length > 0) {
      console.debug("Invalid placement debug", invalidIssueSummary);
    }
  }, [derivedPuzzleState.debugIssues]);

  useEffect(() => {
    if (derivedPuzzleState.isSolved && !wasSolvedRef.current) {
      setIsSolvedModalOpen(true);
    }

    wasSolvedRef.current = derivedPuzzleState.isSolved;
  }, [derivedPuzzleState.isSolved]);

  useEffect(() => {
    function updateScale() {
      if (!scalerElementRef.current) {
        return;
      }

      const availableWidth =
        scalerElementRef.current.getBoundingClientRect().width;
      const nextScale = Math.min(1, (availableWidth - 16) / stageWidth);

      setStageScale(Math.max(0.44, nextScale));
    }

    updateScale();

    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function getStagePoint(event: globalThis.PointerEvent): Point | null {
      if (!stageElementRef.current) {
        return null;
      }

      const stageRectangle = stageElementRef.current.getBoundingClientRect();

      return {
        x:
          ((event.clientX - stageRectangle.left) / stageRectangle.width) *
          stageWidth,
        y:
          ((event.clientY - stageRectangle.top) / stageRectangle.height) *
          stageHeight,
      };
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      event.preventDefault();

      const pointerPoint = getStagePoint(event);

      if (!pointerPoint) {
        return;
      }

      if (!dragState) {
        return;
      }

      const nextLeft = pointerPoint.x - dragState.offsetX;
      const nextTop = pointerPoint.y - dragState.offsetY;

      setPieces((currentPieces) => {
        const currentPiece = currentPieces[dragState.pieceId];
        const snappedBoardLocation = getSnappedBoardLocation(
          nextLeft,
          nextTop,
          currentPiece.matrix,
        );

        return {
          ...currentPieces,
          [dragState.pieceId]: {
            ...currentPiece,
            location:
              snappedBoardLocation ??
              ({
                type: "tabletop",
                x: nextLeft,
                y: nextTop,
              } satisfies TabletopLocation),
          },
        };
      });
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      event.preventDefault();

      const pointerPoint = getStagePoint(event);

      if (!pointerPoint) {
        setDragState(null);

        return;
      }

      if (!dragState) {
        return;
      }

      const nextLeft = pointerPoint.x - dragState.offsetX;
      const nextTop = pointerPoint.y - dragState.offsetY;

      setPieces((currentPieces) => {
        const currentPiece = currentPieces[dragState.pieceId];
        const snappedBoardLocation = getSnappedBoardLocation(
          nextLeft,
          nextTop,
          currentPiece.matrix,
        );

        return {
          ...currentPieces,
          [dragState.pieceId]: {
            ...currentPiece,
            location:
              snappedBoardLocation ??
              ({
                type: "tabletop",
                x: nextLeft,
                y: nextTop,
              } satisfies TabletopLocation),
          },
        };
      });

      setDragState(null);
    }

    document.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    document.addEventListener("pointerup", handlePointerUp, { passive: false });
    document.addEventListener("pointercancel", handlePointerUp, {
      passive: false,
    });

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragState]);

  function bringPieceToFront(pieceId: PieceId) {
    setPieces((currentPieces) => {
      const nextZIndex =
        Math.max(...Object.values(currentPieces).map((piece) => piece.zIndex)) +
        1;

      return {
        ...currentPieces,
        [pieceId]: { ...currentPieces[pieceId], zIndex: nextZIndex },
      };
    });
  }

  function handlePiecePointerDown(
    event: PointerEvent<HTMLDivElement>,
    pieceId: PieceId,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!stageElementRef.current) {
      return;
    }

    const stageRectangle = stageElementRef.current.getBoundingClientRect();

    const pointerPoint = {
      x:
        ((event.clientX - stageRectangle.left) / stageRectangle.width) *
        stageWidth,
      y:
        ((event.clientY - stageRectangle.top) / stageRectangle.height) *
        stageHeight,
    };

    const piece = pieces[pieceId];
    const topLeft = getPieceTopLeft(piece);

    setSelectedPieceId(pieceId);
    bringPieceToFront(pieceId);

    setDragState({
      pieceId,
      offsetX: pointerPoint.x - topLeft.x,
      offsetY: pointerPoint.y - topLeft.y,
    });
  }

  function placeSelectedPieceOnCell(rowIndex: number, columnIndex: number) {
    if (!selectedPieceId) {
      return;
    }

    setPieces((currentPieces) => {
      const nextZIndex =
        Math.max(...Object.values(currentPieces).map((piece) => piece.zIndex)) +
        1;

      return {
        ...currentPieces,
        [selectedPieceId]: {
          ...currentPieces[selectedPieceId],
          zIndex: nextZIndex,
          location: { type: "board", rowIndex, columnIndex },
        },
      };
    });
  }

  function rotateSelectedPiece() {
    if (!selectedPieceId) {
      return;
    }

    setPieces((currentPieces) => ({
      ...currentPieces,
      [selectedPieceId]: {
        ...currentPieces[selectedPieceId],
        matrix: rotateMatrixClockwise(currentPieces[selectedPieceId].matrix),
      },
    }));
  }

  function flipSelectedPiece() {
    if (!selectedPieceId) {
      return;
    }

    setPieces((currentPieces) => ({
      ...currentPieces,
      [selectedPieceId]: {
        ...currentPieces[selectedPieceId],
        matrix: flipMatrixHorizontally(currentPieces[selectedPieceId].matrix),
      },
    }));
  }

  function returnSelectedPieceToTabletop() {
    if (!selectedPieceId) {
      return;
    }

    const homePosition = pieceDefinitions[selectedPieceId].home;

    setPieces((currentPieces) => ({
      ...currentPieces,
      [selectedPieceId]: {
        ...currentPieces[selectedPieceId],
        location: { type: "tabletop", x: homePosition.x, y: homePosition.y },
      },
    }));
  }

  function resetPieces() {
    setSelectedPieceId(null);
    setDragState(null);
    setIsSolvedModalOpen(false);
    setPieces(createInitialPieces());
  }

  function setDateAndReset(nextPuzzleDate: PuzzleDate) {
    setPuzzleDate(nextPuzzleDate);
    resetPieces();
  }

  const selectedPiece = selectedPieceId ? pieces[selectedPieceId] : null;

  return (
    <main className="min-h-svh overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_26%),linear-gradient(135deg,#9a7750,#745236)] p-3 text-stone-950">
      <Dialog open={isSolvedModalOpen} onOpenChange={setIsSolvedModalOpen}>
        <DialogContent className="max-w-md rounded-[1.75rem] border border-amber-950/10 bg-amber-50 p-0 text-amber-950 shadow-2xl">
          <DialogHeader className="gap-3 px-6 pt-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-emerald-800/70 uppercase">
              Puzzle solved
            </p>
            <DialogTitle className="text-3xl font-black">
              Congratulations
            </DialogTitle>
            <DialogDescription className="text-base text-amber-950/75">
              You solved {getPuzzleDateLabel(puzzleDate)}. Pick another day or
              reset pieces for another run.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 rounded-b-[1.75rem] border-amber-950/10 bg-amber-100/70 px-6 py-4">
            <Button
              className="rounded-full bg-amber-950 text-amber-50 hover:bg-amber-900"
              type="button"
              onClick={() => setIsSolvedModalOpen(false)}
            >
              Keep playing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-5xl">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-950/10 bg-amber-100/85 px-4 py-3 shadow-xl backdrop-blur">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-950/60 uppercase">
              A-Puzzle-A-Day
            </p>
            <h1 className="text-2xl leading-tight font-black text-amber-950">
              {getPuzzleDateLabel(puzzleDate)}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="rounded-full bg-white/80"
              type="button"
              variant="secondary"
              onClick={() => setDateAndReset(shiftPuzzleDate(puzzleDate, -1))}
            >
              Previous day
            </Button>

            <Button
              className="rounded-full bg-white/80"
              type="button"
              variant="secondary"
              onClick={() => setDateAndReset(getTodayPuzzleDate())}
            >
              Today
            </Button>

            <Button
              className="rounded-full bg-white/80"
              type="button"
              variant="secondary"
              onClick={() => setDateAndReset(shiftPuzzleDate(puzzleDate, 1))}
            >
              Next day
            </Button>

            <Button
              className="rounded-full bg-amber-950 text-amber-50 hover:bg-amber-900"
              type="button"
              onClick={resetPieces}
            >
              Reset
            </Button>
          </div>
        </header>

        <div
          ref={scalerElementRef}
          className="relative mx-auto overflow-visible"
          style={{ height: stageHeight * stageScale }}
        >
          <div
            ref={stageElementRef}
            className="absolute top-0 left-1/2 touch-none overflow-hidden rounded-[2rem] border border-amber-950/20 shadow-2xl select-none"
            style={{
              width: stageWidth,
              height: stageHeight,
              transform: `translateX(-50%) scale(${stageScale})`,
              transformOrigin: "top center",
              background:
                "radial-gradient(circle at 30% 15%, rgba(255,255,255,.13), transparent 28%), linear-gradient(135deg, #a67c52, #7a5536)",
            }}
            onPointerDown={() => setSelectedPieceId(null)}
          >
            <div
              className="absolute rounded-[1.6rem] border-[3px] border-amber-950/70 bg-[#e5d2a7] shadow-xl"
              style={{
                left: boardLeft - 20,
                top: boardTop - 20,
                width: boardWidth + 40,
                height: boardHeight + 40,
              }}
            />

            {boardCells.map((row, rowIndex) =>
              row.map((boardCell, columnIndex) => {
                if (!boardCell.label) {
                  return null;
                }

                const position = getBoardCellPosition(rowIndex, columnIndex);
                const isTarget = isTargetDateCell(
                  rowIndex,
                  columnIndex,
                  puzzleDate,
                );

                return (
                  <button
                    key={`${rowIndex}:${columnIndex}`}
                    className={cn(
                      "absolute flex items-center justify-center rounded-lg border text-sm font-bold shadow-inner transition",
                      isTarget
                        ? "border-amber-950/80 bg-[#d6c49c] text-amber-950"
                        : "border-amber-900/40 bg-[#e0cb9f] text-amber-950/75 hover:bg-[#ead8b3]",
                    )}
                    style={{
                      left: position.x,
                      top: position.y,
                      width: cellSize,
                      height: cellSize,
                      zIndex: 5,
                    }}
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      placeSelectedPieceOnCell(rowIndex, columnIndex);
                    }}
                  >
                    {boardCell.label}
                  </button>
                );
              }),
            )}

            {Object.values(pieces)
              .sort(
                (firstPiece, secondPiece) =>
                  firstPiece.zIndex - secondPiece.zIndex,
              )
              .map((piece) => (
                <PuzzlePiece
                  key={piece.pieceId}
                  isDragging={dragState?.pieceId === piece.pieceId}
                  isInvalid={derivedPuzzleState.invalidPieceIds.has(
                    piece.pieceId,
                  )}
                  isSelected={piece.pieceId === selectedPieceId}
                  piece={piece}
                  onPointerDown={(event) =>
                    handlePiecePointerDown(event, piece.pieceId)
                  }
                />
              ))}

            <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
              Drag freely. Drop near the board to snap.
            </div>
          </div>
        </div>

        <section className="mt-3 rounded-3xl border border-amber-950/10 bg-amber-100/85 p-3 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-950/60 uppercase">
                Selected piece
              </p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-black text-amber-950">
                  {selectedPiece ? `Piece ${selectedPiece.pieceId}` : "None"}
                </p>

                <Badge
                  className={cn(
                    "rounded-full",
                    derivedPuzzleState.isSolved
                      ? "bg-emerald-100 text-emerald-900"
                      : derivedPuzzleState.invalidPieceIds.size > 0
                        ? "bg-amber-200 text-amber-950"
                        : "bg-white/70 text-amber-950",
                  )}
                >
                  {derivedPuzzleState.isSolved
                    ? "Solved"
                    : derivedPuzzleState.invalidPieceIds.size > 0
                      ? "Temporary invalid state"
                      : "Free play"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                disabled={!selectedPiece}
                type="button"
                variant="secondary"
                onClick={rotateSelectedPiece}
              >
                Rotate
              </Button>

              <Button
                className="rounded-full"
                disabled={!selectedPiece}
                type="button"
                variant="secondary"
                onClick={flipSelectedPiece}
              >
                Flip
              </Button>

              <Button
                className="rounded-full"
                disabled={!selectedPiece}
                type="button"
                variant="secondary"
                onClick={returnSelectedPieceToTabletop}
              >
                Return
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Artifact;
