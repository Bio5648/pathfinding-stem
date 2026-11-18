/**
 * Модуль алгоритмів глобального пошуку шляху на 2D-сітці з перешкодами.
 * Реалізовано: BFS, Dijkstra, A* (A-Star), Greedy Best-First Search.
 */

export const ALGORITHMS = {
  astar: {
    id: 'astar',
    name: 'A* (A-Star)',
    optimal: true,
    description: 'Евристичний пошук f(n) = g(n) + h(n). Гарантує найкоротший шлях за допустимої евристики.'
  },
  dijkstra: {
    id: 'dijkstra',
    name: 'Алгоритм Дейкстри',
    optimal: true,
    description: 'Класичний пошук найкоротшого шляху за накопиченою вартістю g(n) без евристики.'
  },
  bfs: {
    id: 'bfs',
    name: 'Пошук у ширину (BFS)',
    optimal: true,
    description: 'Хвильовий обхід рівнями. Оптимальний для сіток з однаковою вагою переходів.'
  },
  greedy: {
    id: 'greedy',
    name: 'Жадібний пошук (Greedy)',
    optimal: false,
    description: 'Орієнтується лише на евристику h(n). Дуже швидкий, але може знаходити неоптимальний шлях.'
  }
};

/**
 * Обчислення евристичної відстані між двома точками сітки.
 */
export function calculateHeuristic(r1, c1, r2, c2, type = 'manhattan') {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  if (type === 'euclidean') {
    return Math.hypot(dr, dc);
  }
  return dr + dc; // Манхеттенська відстань
}

/**
 * Повертає прохідних ортогональних сусідів клітинки.
 */
function getNeighbors(row, col, rows, cols, walls) {
  const directions = [
    [-1, 0], // вгору
    [0, 1],  // вправо
    [1, 0],  // вниз
    [0, -1]  // вліво
  ];
  const neighbors = [];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !walls[nr][nc]) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

/**
 * Відновлення найкоротшого шляху від фінішу до старту через масив предків.
 */
function reconstructPath(parentMap, start, end) {
  const path = [];
  let currKey = `${end.row},${end.col}`;
  const startKey = `${start.row},${start.col}`;

  if (!parentMap.has(currKey) && currKey !== startKey) {
    return [];
  }

  while (currKey) {
    const [r, c] = currKey.split(',').map(Number);
    path.push({ row: r, col: c });
    if (currKey === startKey) break;
    currKey = parentMap.get(currKey);
  }
  return path.reverse();
}

/**
 * Універсальна функція запуску обраного алгоритму пошуку шляху.
 */
export function runPathfinding({
  algorithmId,
  rows,
  cols,
  walls,
  start,
  end,
  heuristicType = 'manhattan'
}) {
  const t0 = performance.now();
  const visitedOrder = [];
  const parentMap = new Map();
  const visitedSet = new Set();

  const startKey = `${start.row},${start.col}`;
  const endKey = `${end.row},${end.col}`;

  if (walls[start.row]?.[start.col] || walls[end.row]?.[end.col]) {
    return {
      algorithmId,
      algorithmName: ALGORITHMS[algorithmId]?.name || algorithmId,
      visitedOrder: [],
      path: [],
      pathLength: 0,
      visitedCount: 0,
      executionTimeMs: 0,
      found: false,
      optimal: ALGORITHMS[algorithmId]?.optimal ?? false
    };
  }

  if (algorithmId === 'bfs') {
    const queue = [[start.row, start.col]];
    visitedSet.add(startKey);

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      const key = `${r},${c}`;
      visitedOrder.push({ row: r, col: c });

      if (key === endKey) break;

      for (const [nr, nc] of getNeighbors(r, c, rows, cols, walls)) {
        const nKey = `${nr},${nc}`;
        if (!visitedSet.has(nKey)) {
          visitedSet.add(nKey);
          parentMap.set(nKey, key);
          queue.push([nr, nc]);
        }
      }
    }
  } else {
    // Dijkstra, A*, Greedy Best-First
    const gScore = new Map([[startKey, 0]]);
    const openList = [{
      row: start.row,
      col: start.col,
      g: 0,
      f: algorithmId === 'dijkstra'
        ? 0
        : calculateHeuristic(start.row, start.col, end.row, end.col, heuristicType)
    }];

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f || a.g - b.g);
      const current = openList.shift();
      const key = `${current.row},${current.col}`;

      if (visitedSet.has(key)) continue;
      visitedSet.add(key);
      visitedOrder.push({ row: current.row, col: current.col });

      if (key === endKey) break;

      for (const [nr, nc] of getNeighbors(current.row, current.col, rows, cols, walls)) {
        const nKey = `${nr},${nc}`;
        if (visitedSet.has(nKey)) continue;

        const tentativeG = current.g + 1;
        const prevG = gScore.has(nKey) ? gScore.get(nKey) : Infinity;

        if (tentativeG < prevG) {
          gScore.set(nKey, tentativeG);
          parentMap.set(nKey, key);

          const h = calculateHeuristic(nr, nc, end.row, end.col, heuristicType);
          let f = tentativeG;
          if (algorithmId === 'astar') f = tentativeG + h;
          if (algorithmId === 'greedy') f = h;

          openList.push({ row: nr, col: nc, g: tentativeG, f });
        }
      }
    }
  }

  const path = reconstructPath(parentMap, start, end);
  const t1 = performance.now();

  return {
    algorithmId,
    algorithmName: ALGORITHMS[algorithmId]?.name || algorithmId,
    visitedOrder,
    path,
    pathLength: path.length > 0 ? path.length - 1 : 0, // кількість кроків (ребер)
    visitedCount: visitedOrder.length,
    executionTimeMs: Number((t1 - t0).toFixed(3)),
    found: path.length > 0,
    optimal: ALGORITHMS[algorithmId]?.optimal ?? false
  };
}

/**
 * Запуск усіх 4 алгоритмів на одній і тій самій карті для порівняльного аналізу.
 */
export function runAllComparisons(params) {
  return Object.keys(ALGORITHMS).map((algId) =>
    runPathfinding({ ...params, algorithmId: algId })
  );
}

/**
 * Безпечна валідація розмірів сітки (захист від зависання браузера).
 */
export function sanitizeGridDimensions(rows, cols) {
  const safeRows = Math.min(30, Math.max(5, Number(rows) || 15));
  const safeCols = Math.min(45, Math.max(5, Number(cols) || 25));
  return { rows: safeRows, cols: safeCols };
}

/**
 * Генерація випадкових перешкод із гарантією вільних клітинок Старт/Фініш.
 */
export function generateRandomWalls(rows, cols, start, end, density = 0.28) {
  const safeDensity = Math.min(0.45, Math.max(0.05, Number(density) || 0.28));
  const walls = Array.from({ length: rows }, () => Array(cols).fill(false));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isStart = r === start.row && c === start.col;
      const isEnd = r === end.row && c === end.col;
      if (!isStart && !isEnd && Math.random() < safeDensity) {
        walls[r][c] = true;
      }
    }
  }
  return walls;
}