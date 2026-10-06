import solutionsJson from "@/data/a-puzzle-a-day-all-solutions.json";

export const puzzlePieceIds = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export type PuzzlePieceId = (typeof puzzlePieceIds)[number];

export type PuzzleDate = {
  monthIndex: number;
  day: number;
};

export type HintStrategy = "preserve-options" | "reduce-options";

export type PuzzleSolution = Record<PuzzlePieceId, Array<string | number>>;

type SolutionsData = Record<string, Record<string, PuzzleSolution[]>>;

export type HintStep = {
  pieceId: PuzzlePieceId;
  cells: string[];
  candidatesBefore: number;
  candidatesAfter: number;
};

const solutionsData = solutionsJson as SolutionsData;

const boardLabelOrder = [
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
  ...Array.from({ length: 31 }, (_, dayIndex) => String(dayIndex + 1)),
];

const boardLabelRank = new Map(
  boardLabelOrder.map((label, labelIndex) => [label, labelIndex]),
);

function normalizeCells(cells: Array<string | number>): string[] {
  return cells.map(String).sort((firstCell, secondCell) => {
    const firstRank = boardLabelRank.get(firstCell) ?? Number.MAX_SAFE_INTEGER;
    const secondRank =
      boardLabelRank.get(secondCell) ?? Number.MAX_SAFE_INTEGER;

    if (firstRank !== secondRank) {
      return firstRank - secondRank;
    }

    return firstCell.localeCompare(secondCell);
  });
}

function getPlacementSignature(
  pieceId: PuzzlePieceId,
  cells: Array<string | number>,
): string {
  return `${pieceId}:${normalizeCells(cells).join("|")}`;
}

function solutionMatchesHint(
  solution: PuzzleSolution,
  hint: Pick<HintStep, "pieceId" | "cells">,
): boolean {
  return (
    getPlacementSignature(hint.pieceId, solution[hint.pieceId]) ===
    getPlacementSignature(hint.pieceId, hint.cells)
  );
}

export function getPuzzleSolutions(puzzleDate: PuzzleDate): PuzzleSolution[] {
  const monthKey = String(puzzleDate.monthIndex + 1);
  const dayKey = String(puzzleDate.day);

  return solutionsData[monthKey]?.[dayKey] ?? [];
}

export function getNextHint(
  candidateSolutions: PuzzleSolution[],
  revealedPieceIds: ReadonlySet<PuzzlePieceId>,
  strategy: HintStrategy,
): HintStep | null {
  if (candidateSolutions.length === 0) {
    return null;
  }

  const placementGroups = new Map<
    string,
    {
      pieceId: PuzzlePieceId;
      cells: string[];
      supportCount: number;
    }
  >();

  for (const solution of candidateSolutions) {
    for (const pieceId of puzzlePieceIds) {
      if (revealedPieceIds.has(pieceId)) {
        continue;
      }

      const cells = normalizeCells(solution[pieceId]);
      const signature = getPlacementSignature(pieceId, cells);
      const existingGroup = placementGroups.get(signature);

      if (existingGroup) {
        existingGroup.supportCount += 1;
        continue;
      }

      placementGroups.set(signature, {
        pieceId,
        cells,
        supportCount: 1,
      });
    }
  }

  const candidates = [...placementGroups.values()];

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((firstCandidate, secondCandidate) => {
    const supportDifference =
      strategy === "preserve-options"
        ? secondCandidate.supportCount - firstCandidate.supportCount
        : firstCandidate.supportCount - secondCandidate.supportCount;

    if (supportDifference !== 0) {
      return supportDifference;
    }

    const firstPieceIndex = puzzlePieceIds.indexOf(firstCandidate.pieceId);
    const secondPieceIndex = puzzlePieceIds.indexOf(secondCandidate.pieceId);

    if (firstPieceIndex !== secondPieceIndex) {
      return firstPieceIndex - secondPieceIndex;
    }

    return firstCandidate.cells
      .join("|")
      .localeCompare(secondCandidate.cells.join("|"));
  });

  const selectedPlacement = candidates[0];

  if (!selectedPlacement) {
    return null;
  }

  return {
    pieceId: selectedPlacement.pieceId,
    cells: selectedPlacement.cells,
    candidatesBefore: candidateSolutions.length,
    candidatesAfter: selectedPlacement.supportCount,
  };
}

export function filterSolutionsByHint(
  candidateSolutions: PuzzleSolution[],
  hint: Pick<HintStep, "pieceId" | "cells">,
): PuzzleSolution[] {
  return candidateSolutions.filter((solution) =>
    solutionMatchesHint(solution, hint),
  );
}

export function buildHintSequence(
  puzzleDate: PuzzleDate,
  strategy: HintStrategy,
): HintStep[] {
  let candidateSolutions = getPuzzleSolutions(puzzleDate);

  const revealedPieceIds = new Set<PuzzlePieceId>();
  const hints: HintStep[] = [];

  while (
    candidateSolutions.length > 0 &&
    revealedPieceIds.size < puzzlePieceIds.length
  ) {
    const nextHint = getNextHint(
      candidateSolutions,
      revealedPieceIds,
      strategy,
    );

    if (!nextHint) {
      break;
    }

    hints.push(nextHint);
    revealedPieceIds.add(nextHint.pieceId);

    candidateSolutions = filterSolutionsByHint(candidateSolutions, nextHint);
  }

  return hints;
}
