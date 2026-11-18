import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runPathfinding,
  runAllComparisons,
  sanitizeGridDimensions,
  calculateHeuristic
} from './pathfinding.js';

function createEmptyWalls(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(false));
}

test('1. Пошук найкоротшого шляху на порожньому полі 5x5 (всі оптимальні алгоритми)', () => {
  const walls = createEmptyWalls(5, 5);
  const start = { row: 0, col: 0 };
  const end = { row: 4, col: 4 }; // Манхеттенська відстань = 8 кроків

  for (const algorithmId of ['astar', 'dijkstra', 'bfs']) {
    const res = runPathfinding({ algorithmId, rows: 5, cols: 5, walls, start, end });
    assert.equal(res.found, true, `${algorithmId} повинен знайти шлях`);
    assert.equal(res.pathLength, 8, `${algorithmId} повинен знайти шлях довжиною 8`);
  }
});

test('2. Обхід U-подібної перешкоди (порівняння оптимальності A* та Greedy)', () => {
  const walls = createEmptyWalls(5, 6);
  // Будуємо U-подібну пастку перед фінішем
  walls[1][3] = true;
  walls[2][3] = true;
  walls[3][3] = true;
  walls[1][2] = true;
  walls[3][2] = true;

  const start = { row: 2, col: 1 };
  const end = { row: 2, col: 4 };

  const astarRes = runPathfinding({ algorithmId: 'astar', rows: 5, cols: 6, walls, start, end });
  const greedyRes = runPathfinding({ algorithmId: 'greedy', rows: 5, cols: 6, walls, start, end });

  assert.equal(astarRes.found, true);
  assert.equal(greedyRes.found, true);
  assert.ok(astarRes.pathLength <= greedyRes.pathLength, 'A* не може бути довшим за Greedy');
});

test('3. Коректна обробка ситуації, коли шлях повністю заблоковано', () => {
  const walls = createEmptyWalls(4, 4);
  // Суцільна стіна у стовпці 2
  walls[0][2] = true;
  walls[1][2] = true;
  walls[2][2] = true;
  walls[3][2] = true;

  const res = runPathfinding({
    algorithmId: 'astar',
    rows: 4,
    cols: 4,
    walls,
    start: { row: 1, col: 0 },
    end: { row: 1, col: 3 }
  });

  assert.equal(res.found, false);
  assert.equal(res.pathLength, 0);
});

test('4. Порівняльний аналіз повертає метрики для всіх 4 алгоритмів', () => {
  const walls = createEmptyWalls(6, 6);
  const results = runAllComparisons({
    rows: 6,
    cols: 6,
    walls,
    start: { row: 0, col: 0 },
    end: { row: 5, col: 5 }
  });

  assert.equal(results.length, 4);
  assert.ok(results.every((r) => typeof r.executionTimeMs === 'number' && r.visitedCount > 0));
});

test('5. Валідація меж сітки та обчислення евристики', () => {
  assert.deepEqual(sanitizeGridDimensions(-10, 999), { rows: 5, cols: 45 });
  assert.equal(calculateHeuristic(0, 0, 3, 4, 'manhattan'), 7);
  assert.equal(calculateHeuristic(0, 0, 3, 4, 'euclidean'), 5);
});