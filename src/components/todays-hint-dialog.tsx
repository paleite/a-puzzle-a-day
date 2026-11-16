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
  filterSolutionsByHint,
  getHintAlternatives,
  getPuzzleSolutions,
  puzzlePieceIds,
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
    <div className="aspect-square w-[min(100cqw,100cqh)] max-h-full max-w-full overflow-hidden rounded-[1.25rem] border border-amber-950/20 bg-[#e5d2a7] p-2 shadow-inner sm:p-3">
      <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-1 sm:gap-1.5">
        {boardCells.flatMap((row, rowIndex) =>
          row.map((boardCell, columnIndex) => {
            if (!boardCell.label) {
              return (
                <div
                  key={`${rowIndex}:${columnIndex}`}
                  aria-hidden="true"
                  className="aspect-square min-h-0 min-w-0"
                />
              );
            }

            const pieceId = pieceByCellLabel.get(boardCell.label);
            const target = isTargetCell(boardCell, puzzleDate);

            return (
              <div
                key={`${rowIndex}:${columnIndex}`}
                className={cn(
                  "relative flex aspect-square min-h-0 min-w-0 items-center justify-center rounded-md border text-[0.55rem] font-bold sm:text-xs",
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
                    className="text-xs font-black sm:text-sm"
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
  const [acceptedHints, setAcceptedHints] = useState<HintStep[]>([]);
  const [alternativeIndex, setAlternativeIndex] = useState(0);

  const candidateSolutions = useMemo(
    () =>
      acceptedHints.reduce(
        (solutions, hint) => filterSolutionsByHint(solutions, hint),
        getPuzzleSolutions(puzzleDate),
      ),
    [acceptedHints, puzzleDate],
  );

  const alternatives = useMemo(
    () =>
      strategy
        ? getHintAlternatives(
            candidateSolutions,
            new Set(acceptedHints.map((hint) => hint.pieceId)),
            strategy,
          )
        : [],
    [acceptedHints, candidateSolutions, strategy],
  );

  // The current placement is provisional. Only accepted hints narrow the next step.
  const currentHint = alternatives[alternativeIndex] ?? null;
  const revealedHints = currentHint
    ? [...acceptedHints, currentHint]
    : acceptedHints;
  const revealedHintCount = revealedHints.length;
  const isComplete = acceptedHints.length === puzzlePieceIds.length;

  function selectStrategy(nextStrategy: HintStrategy) {
    setStrategy(nextStrategy);
    setAcceptedHints([]);
    setAlternativeIndex(0);
  }

  function cycleAlternative(direction: number) {
    if (alternatives.length < 2) {
      return;
    }

    setAlternativeIndex((index) =>
      (index + direction + alternatives.length) % alternatives.length,
    );
  }

  function revealNextHint() {
    if (!currentHint) {
      return;
    }

    setAcceptedHints((hints) => [...hints, currentHint]);
    setAlternativeIndex(0);
  }

  function resetDialogState() {
    setStrategy(null);
    setAcceptedHints([]);
    setAlternativeIndex(0);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetDialogState();
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grid h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[1.25rem] border border-amber-950/10 bg-amber-50 p-0 text-amber-950 shadow-2xl sm:h-[min(760px,calc(100dvh-2rem))] sm:rounded-[1.75rem]">
        <DialogHeader className="min-w-0 gap-1 px-4 pt-4 pr-12 sm:px-6 sm:pt-5">
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-emerald-800/70 uppercase">
            Hint
          </p>

          <DialogTitle className="text-xl font-black sm:text-2xl">
            {strategy
              ? `Hint ${revealedHintCount} for ${getPuzzleDateLabel(
                  puzzleDate,
                )}`
              : `How much help do you want?`}
          </DialogTitle>

          <DialogDescription className="sr-only">
            Choose a hint strategy, browse compatible placements, then accept each hint.
          </DialogDescription>
        </DialogHeader>

        {!strategy ? (
          <div className="grid min-h-0 content-center gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6">
            <button
              className="rounded-2xl border border-amber-950/15 bg-white/70 p-4 text-left transition hover:border-amber-950/30 hover:bg-white"
              type="button"
              onClick={() => selectStrategy("preserve-options")}
            >
              <span className="block text-lg font-black text-amber-950">
                Keep it challenging
              </span>
            </button>

            <button
              className="rounded-2xl border border-amber-950/15 bg-white/70 p-4 text-left transition hover:border-amber-950/30 hover:bg-white"
              type="button"
              onClick={() => selectStrategy("reduce-options")}
            >
              <span className="block text-lg font-black text-amber-950">
                Give me a stronger hint
              </span>
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-6">
            <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
              <HintBoard puzzleDate={puzzleDate} revealedHints={revealedHints} />
            </div>

            <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-amber-950/10 bg-white/65 p-3">
              <div className="min-w-0">
                <p className="font-black">
                  {currentHint
                    ? `Place piece ${currentHint.pieceId}`
                    : isComplete
                      ? "All pieces revealed"
                      : "No solution available"}
                </p>
                {currentHint && (
                  <p className="truncate text-xs text-amber-950/75">
                    {currentHint.cells.join(", ")}
                  </p>
                )}
              </div>
              <p className="whitespace-nowrap text-right text-xs font-semibold text-amber-950/65 tabular-nums">
                {currentHint
                  ? `${currentHint.candidatesAfter} of ${currentHint.candidatesBefore} solutions`
                  : `${candidateSolutions.length} solutions`}
              </p>
            </div>
            {currentHint && (
              <div className="flex shrink-0 items-center justify-between gap-2">
                <Button
                  aria-label="Previous hint alternative"
                  className="rounded-full"
                  disabled={alternatives.length < 2}
                  onClick={() => cycleAlternative(-1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-xs font-semibold text-amber-950/65 tabular-nums">
                  Alternative {alternativeIndex + 1} of {alternatives.length}
                </span>
                <Button
                  aria-label="Next hint alternative"
                  className="rounded-full"
                  disabled={alternatives.length < 2}
                  onClick={() => cycleAlternative(1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="m-0 flex-row flex-wrap items-center justify-between gap-2 rounded-b-[1.25rem] border-t border-amber-950/10 bg-amber-100/70 px-3 py-3 sm:px-6">
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
                disabled={!currentHint}
                type="button"
                onClick={revealNextHint}
              >
                {currentHint ? (acceptedHints.length === puzzlePieceIds.length - 1
                    ? "Finish"
                    : "Next hint") : "All pieces revealed"}
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
