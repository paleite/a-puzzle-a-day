/** Committed puzzle placements; pointer coordinates never enter this state. */
export type BoardLocation = {
  type: "board";
  rowIndex: number;
  columnIndex: number;
};

export type TabletopLocation = { type: "tabletop"; x: number; y: number };
export type PieceLocation = BoardLocation | TabletopLocation;

type Point = { x: number; y: number };
type Dimensions = { width: number; height: number };
type BoardGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  cellStep: number;
};

/**
 * A pure domain transition from a released visual position to a committed
 * placement. Only the caller decides when a drag has successfully completed.
 */
export function resolvePieceDropLocation(
  position: Point,
  dimensions: Dimensions,
  board: BoardGeometry,
): PieceLocation {
  const snapPadding = board.cellStep * 1.5;
  const intersectsSnapArea =
    position.x + dimensions.width >= board.left - snapPadding &&
    position.x <= board.left + board.width + snapPadding &&
    position.y + dimensions.height >= board.top - snapPadding &&
    position.y <= board.top + board.height + snapPadding;

  if (!intersectsSnapArea) {
    return { type: "tabletop", x: position.x, y: position.y };
  }

  return {
    type: "board",
    rowIndex: Math.round((position.y - board.top) / board.cellStep),
    columnIndex: Math.round((position.x - board.left) / board.cellStep),
  };
}
