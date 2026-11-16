"use client";

import type { PointerEvent, RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type Point = { x: number; y: number };

type StageBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type DragSession<PieceId extends string> = {
  pieceId: PieceId;
  pointerId: number;
  origin: Point;
  grabOffset: Point;
  bounds: StageBounds;
  latestPosition: Point;
  animationFrameId: number | null;
};

type UsePieceDragOptions<PieceId extends string> = {
  stageElementRef: RefObject<HTMLDivElement | null>;
  stageSize: { width: number; height: number };
  onDrop: (pieceId: PieceId, position: Point) => void;
};

/** Converts viewport pointer coordinates into the logical, scaled stage. */
export function getStagePointerPosition(
  pointer: { clientX: number; clientY: number },
  bounds: StageBounds,
  stageSize: { width: number; height: number },
): Point {
  return {
    x: ((pointer.clientX - bounds.left) / bounds.width) * stageSize.width,
    y: ((pointer.clientY - bounds.top) / bounds.height) * stageSize.height,
  };
}

/** A visual position only; it is never a committed board placement. */
export function getDraggedPiecePosition(
  pointer: Point,
  grabOffset: Point,
): Point {
  return {
    x: pointer.x - grabOffset.x,
    y: pointer.y - grabOffset.y,
  };
}

/**
 * Owns the drag presentation lifecycle.
 *
 * React tracks only the active piece identity; rAF writes transient transforms
 * without triggering game-state recalculation. The caller owns all placement
 * rules and receives a single onDrop event after a successful pointer release.
 */
export function usePieceDrag<PieceId extends string>({
  stageElementRef,
  stageSize,
  onDrop,
}: UsePieceDragOptions<PieceId>) {
  const pieceElementsRef = useRef(new Map<PieceId, HTMLDivElement>());
  const dragSessionRef = useRef<DragSession<PieceId> | null>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<PieceId | null>(null);
  const onDropRef = useRef(onDrop);

  useLayoutEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  const registerPieceElement = useCallback(
    (pieceId: PieceId, element: HTMLDivElement | null) => {
      if (element) {
        pieceElementsRef.current.set(pieceId, element);
      } else {
        pieceElementsRef.current.delete(pieceId);
      }
    },
    [],
  );

  const stopDrag = useCallback(() => {
    const session = dragSessionRef.current;
    if (!session) {
      return;
    }

    dragSessionRef.current = null;
    if (session.animationFrameId !== null) {
      window.cancelAnimationFrame(session.animationFrameId);
    }

    // Do not clear the visual transform here. It must remain until React has
    // committed the new logical placement, or a cancelled drag has reverted.
    setDraggingPieceId(null);
  }, []);

  const cancelDrag = useCallback(() => {
    stopDrag();
  }, [stopDrag]);

  const beginDrag = useCallback(
    (
      event: PointerEvent<HTMLDivElement>,
      pieceId: PieceId,
      origin: Point,
    ) => {
      if (dragSessionRef.current || !stageElementRef.current) {
        return false;
      }

      const rectangle = stageElementRef.current.getBoundingClientRect();
      if (rectangle.width === 0 || rectangle.height === 0) {
        return false;
      }

      const bounds = {
        left: rectangle.left,
        top: rectangle.top,
        width: rectangle.width,
        height: rectangle.height,
      };
      const pointer = getStagePointerPosition(event, bounds, stageSize);

      dragSessionRef.current = {
        pieceId,
        pointerId: event.pointerId,
        origin,
        grabOffset: {
          x: pointer.x - origin.x,
          y: pointer.y - origin.y,
        },
        bounds,
        latestPosition: origin,
        animationFrameId: null,
      };
      setDraggingPieceId(pieceId);
      return true;
    },
    [stageElementRef, stageSize],
  );

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      event.preventDefault();
      const pointer = getStagePointerPosition(
        event,
        session.bounds,
        stageSize,
      );
      session.latestPosition = getDraggedPiecePosition(
        pointer,
        session.grabOffset,
      );

      if (session.animationFrameId !== null) {
        return;
      }

      session.animationFrameId = window.requestAnimationFrame(() => {
        session.animationFrameId = null;
        if (dragSessionRef.current !== session) {
          return;
        }

        const element = pieceElementsRef.current.get(session.pieceId);
        if (element) {
          const { x, y } = session.latestPosition;
          element.style.transform = `translate3d(${x - session.origin.x}px, ${y - session.origin.y}px, 0)`;
        }
      });
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      event.preventDefault();
      const pointer = getStagePointerPosition(
        event,
        session.bounds,
        stageSize,
      );
      const releasePosition = getDraggedPiecePosition(
        pointer,
        session.grabOffset,
      );

      // React 19 batches the placement and presentation updates from this
      // event. The layout effect below removes the transform after commit.
      onDropRef.current(session.pieceId, releasePosition);
      stopDrag();
    }

    function handlePointerCancel(event: globalThis.PointerEvent) {
      const session = dragSessionRef.current;
      if (session && event.pointerId === session.pointerId) {
        stopDrag();
      }
    }

    function handleWindowBlur() {
      stopDrag();
    }

    document.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    document.addEventListener("pointerup", handlePointerUp, { passive: false });
    document.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleWindowBlur);
      const session = dragSessionRef.current;
      if (session?.animationFrameId !== null && session?.animationFrameId !== undefined) {
        window.cancelAnimationFrame(session.animationFrameId);
      }
    };
  }, [stageSize, stopDrag]);

  // The committed React position has now rendered. Remove the transient
  // transform before paint, including after cancellation or reset.
  useLayoutEffect(() => {
    if (draggingPieceId === null) {
      for (const element of pieceElementsRef.current.values()) {
        element.style.transform = "";
      }
    }
  }, [draggingPieceId]);

  return { draggingPieceId, beginDrag, cancelDrag, registerPieceElement };
}
