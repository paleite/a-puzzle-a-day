"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildHintSequence,
  type HintStep,
  type HintStrategy,
  type PuzzleDate,
  type PuzzlePieceId,
} from "@/lib/puzzle-hints";
import { cn } from "@/lib/utils";

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

type BoardCell = {
  label: string | null;
  type: "month" | "day" | "absent";
};

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

const pieceColors: Record<PuzzlePieceId, string> = {
  A: "#c4e3ec",
  B: "#5c9fb0",
  C: "#b1d6dc",
  D: "#98c5cb",
  E: "#cbeaf0",
  F: "#b0d8dd",
  G: "#a7d3d8",
  H: "#7dafbe",
};

function getPuzzleDateLabel(puzzleDate: PuzzleDate): string {
  return `${monthLabels[puzzleDate.monthIndex]} ${puzzleDate.day}`;
}

function isTargetCell(boardCell: BoardCell, puzzleDate: PuzzleDate): boolean {
  if (!boardCell.label) {
    return false;
  }

  if (boardCell.type === "month") {
    return boardCell.label === monthLabels[puzzleDate.monthIndex];
  }

  if (boardCell.type === "day") {
    return boardCell.label === String(puzzleDate.day);
  }

  return false;
}

function HintBoard({
  puzzleDate,
  revealedHints,
}: {
  puzzleDate: PuzzleDate;
  revealedHints: HintStep[];
}) {
  const pieceByCellLabel = useMemo(() => {
    const result = new Map<string, PuzzlePieceId>();

    for (const hint of revealedHints) {
      for (const cell of hint.cells) {
        result.set(cell, hint.pieceId);
      }
    }

    return result;
  }, [revealedHints]);

  return (
    <div className="mx-auto w-full max-w-[28rem] rounded-[1.5rem] border border-amber-950/20 bg-[#e5d2a7] p-3 shadow-inner">
      <div className="grid grid-cols-7 gap-1.5">
        {boardCells.flatMap((row, rowIndex) =>
          row.map((boardCell, columnIndex) => {
            if (!boardCell.label) {
              return (
                <div
                  key={`${rowIndex}:${columnIndex}`}
                  aria-hidden="true"
                  className="aspect-square"
                />
              );
            }

            const pieceId = pieceByCellLabel.get(boardCell.label);
            const target = isTargetCell(boardCell, puzzleDate);

            return (
              <div
                key={`${rowIndex}:${columnIndex}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-md border text-[0.65rem] font-bold sm:text-xs",
                  target && "border-amber-950/80 bg-[#d6c49c] text-amber-950",
                  !target &&
                    !pieceId &&
                    "border-amber-900/35 bg-[#e0cb9f] text-amber-950/65",
                  pieceId && "border-amber-950/55 text-amber-950 shadow-sm",
                )}
                style={
                  pieceId
                    ? {
                        backgroundColor: pieceColors[pieceId],
                      }
                    : undefined
                }
              >
                {pieceId ? (
                  <span
                    aria-label={`Piece ${pieceId} covers ${boardCell.label}`}
                    className="text-sm font-black"
                  >
                    {pieceId}
                  </span>
                ) : (
                  boardCell.label
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

type TodaysHintDialogProps = {
  open: boolean;
  puzzleDate: PuzzleDate;
  onOpenChange: (open: boolean) => void;
};

export function TodaysHintDialog({
  open,
  puzzleDate,
  onOpenChange,
}: TodaysHintDialogProps) {
  const [strategy, setStrategy] = useState<HintStrategy | null>(null);
  const [revealedHintCount, setRevealedHintCount] = useState(0);

  const hintSequence = useMemo(() => {
    if (!strategy) {
      return [];
    }

    return buildHintSequence(puzzleDate, strategy);
  }, [puzzleDate, strategy]);

  const revealedHints = hintSequence.slice(0, revealedHintCount);
  const currentHint = revealedHints.at(-1) ?? null;

  const hasMoreHints =
    strategy !== null && revealedHintCount < hintSequence.length;

  function selectStrategy(nextStrategy: HintStrategy) {
    setStrategy(nextStrategy);
    setRevealedHintCount(1);
  }

  function revealNextHint() {
    setRevealedHintCount((currentCount) =>
      Math.min(currentCount + 1, hintSequence.length),
    );
  }

  function resetDialogState() {
    setStrategy(null);
    setRevealedHintCount(0);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetDialogState();
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92svh] max-w-2xl overflow-y-auto rounded-[1.75rem] border border-amber-950/10 bg-amber-50 p-0 text-amber-950 shadow-2xl">
        <DialogHeader className="gap-3 px-6 pt-6">
          <p className="text-xs font-semibold tracking-[0.22em] text-emerald-800/70 uppercase">
            Hint
          </p>

          <DialogTitle className="text-3xl font-black">
            {strategy
              ? `Hint ${revealedHintCount} for ${getPuzzleDateLabel(
                  puzzleDate,
                )}`
              : `How much help do you want?`}
          </DialogTitle>

          <DialogDescription className="text-base text-amber-950/75">
            {strategy
              ? "Each hint fixes one puzzle piece. Press Next hint only when you want another part of the solution."
              : `Choose how aggressively the hint should narrow the possible solutions for ${getPuzzleDateLabel(
                  puzzleDate,
                )}.`}
          </DialogDescription>
        </DialogHeader>

        {!strategy ? (
          <div className="grid gap-3 px-6 py-6 sm:grid-cols-2">
            <button
              className="rounded-2xl border border-amber-950/15 bg-white/70 p-5 text-left transition hover:border-amber-950/30 hover:bg-white"
              type="button"
              onClick={() => selectStrategy("preserve-options")}
            >
              <span className="block text-lg font-black text-amber-950">
                Keep it challenging
              </span>

              <span className="mt-2 block text-sm leading-relaxed text-amber-950/70">
                Reveals a piece placement shared by as many remaining solutions
                as possible. You get useful information while keeping more ways
                to finish the puzzle.
              </span>
            </button>

            <button
              className="rounded-2xl border border-amber-950/15 bg-white/70 p-5 text-left transition hover:border-amber-950/30 hover:bg-white"
              type="button"
              onClick={() => selectStrategy("reduce-options")}
            >
              <span className="block text-lg font-black text-amber-950">
                Give me a stronger hint
              </span>

              <span className="mt-2 block text-sm leading-relaxed text-amber-950/70">
                Reveals a piece placement that eliminates as many remaining
                solutions as possible. This moves you toward one concrete
                solution faster.
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-6">
            <HintBoard puzzleDate={puzzleDate} revealedHints={revealedHints} />

            {currentHint ? (
              <div className="rounded-2xl border border-amber-950/10 bg-white/65 p-4">
                <p className="text-lg font-black">
                  Place piece {currentHint.pieceId}
                </p>

                <p className="mt-1 text-sm text-amber-950/75">
                  It covers: {currentHint.cells.join(", ")}
                </p>

                <p className="mt-3 text-xs font-semibold tracking-wide text-amber-950/55 uppercase">
                  {currentHint.candidatesAfter} of{" "}
                  {currentHint.candidatesBefore} candidate solutions remain
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-950/10 bg-white/65 p-4 text-sm text-amber-950/70">
                No precomputed solution is available for this date.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="rounded-b-[1.75rem] border-t border-amber-950/10 bg-amber-100/70 px-6 py-4">
          {strategy ? (
            <>
              <Button
                className="rounded-full"
                type="button"
                variant="secondary"
                onClick={resetDialogState}
              >
                Change hint type
              </Button>

              <Button
                className="rounded-full bg-amber-950 text-amber-50 hover:bg-amber-900"
                disabled={!hasMoreHints}
                type="button"
                onClick={revealNextHint}
              >
                {hasMoreHints ? "Next hint" : "All pieces revealed"}
              </Button>
            </>
          ) : (
            <Button
              className="rounded-full"
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
