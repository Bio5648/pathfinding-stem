import { useState, useRef, useEffect } from 'react';
import {
  ALGORITHMS,
  runPathfinding,
  runAllComparisons,
  generateRandomWalls,
  sanitizeGridDimensions
} from './algorithms/pathfinding';
import './App.css';

const DEFAULT_ROWS = 15;
const DEFAULT_COLS = 25;

function createEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(false));
}

export default function App() {
  const [dimensions, setDimensions] = useState({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS });
  const [walls, setWalls] = useState(() => createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));
  const [start, setStart] = useState({ row: 7, col: 4 });
  const [end, setEnd] = useState({ row: 7, col: 20 });

  const [selectedAlg, setSelectedAlg] = useState('astar');
  const [heuristic, setHeuristic] = useState('manhattan');
  const [speedMs, setSpeedMs] = useState(18);
  const [drawMode, setDrawMode] = useState('wall'); // 'wall' | 'start' | 'end'
  const [isMouseDown, setIsMouseDown] = useState(false);

  // стани симуляції: 'idle' | 'running' | 'completed'
  const [simState, setSimState] = useState('idle');
  const [visitedCells, setVisitedCells] = useState(new Set());
  const [pathCells, setPathCells] = useState(new Set());
  const [comparisonResults, setComparisonResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Оберіть алгоритм або намалюйте перешкоди на сітці.');

  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const resetVisualization = () => {
    clearTimers();
    setVisitedCells(new Set());
    setPathCells(new Set());
    setSimState('idle');
  };

  const handleGridSizeChange = (newRows, newCols) => {
    resetVisualization();
    const safe = sanitizeGridDimensions(newRows, newCols);
    const nextStart = {
      row: Math.min(start.row, safe.rows - 1),
      col: Math.min(start.col, safe.cols - 1)
    };
    const nextEnd = {
      row: Math.min(end.row, safe.rows - 1),
      col: Math.min(end.col, safe.cols - 1)
    };
    if (nextStart.row === nextEnd.row && nextStart.col === nextEnd.col) {
      nextEnd.col = Math.max(0, safe.cols - 2);
    }
    setDimensions(safe);
    setStart(nextStart);
    setEnd(nextEnd);
    setWalls(createEmptyGrid(safe.rows, safe.cols));
    setComparisonResults([]);
  };

  const applyCellAction = (r, c, toggleWall = false) => {
    if (simState === 'running') return;
    resetVisualization();

    if (drawMode === 'start') {
      if ((r !== end.row || c !== end.col) && !walls[r][c]) {
        setStart({ row: r, col: c });
      }
      return;
    }

    if (drawMode === 'end') {
      if ((r !== start.row || c !== start.col) && !walls[r][c]) {
        setEnd({ row: r, col: c });
      }
      return;
    }

    if ((r === start.row && c === start.col) || (r === end.row && c === end.col)) return;

    setWalls((prev) =>
      prev.map((rowArr, rIdx) =>
        rIdx === r
          ? rowArr.map((cell, cIdx) => (cIdx === c ? (toggleWall ? !cell : true) : cell))
          : rowArr
      )
    );
  };

  const handleGenerateMaze = () => {
    resetVisualization();
    setWalls(generateRandomWalls(dimensions.rows, dimensions.cols, start, end, 0.28));
    setStatusMessage('Згенеровано випадкове середовище з перешкодами (щільність 28%).');
  };

  const handleClearAll = () => {
    resetVisualization();
    setWalls(createEmptyGrid(dimensions.rows, dimensions.cols));
    setComparisonResults([]);
    setStatusMessage('Карту та результати очищено.');
  };

  const handleVisualizeSingle = () => {
    resetVisualization();
    const res = runPathfinding({
      algorithmId: selectedAlg,
      rows: dimensions.rows,
      cols: dimensions.cols,
      walls,
      start,
      end,
      heuristicType: heuristic
    });

    setComparisonResults((prev) => {
      const filtered = prev.filter((item) => item.algorithmId !== res.algorithmId);
      return [...filtered, res];
    });

    if (speedMs === 0) {
      setVisitedCells(new Set(res.visitedOrder.map((p) => `${p.row},${p.col}`)));
      setPathCells(new Set(res.path.map((p) => `${p.row},${p.col}`)));
      setSimState('completed');
      setStatusMessage(
        res.found
          ? `${res.algorithmName}: шлях знайдено (${res.pathLength} кроків, відвідано ${res.visitedCount} вузлів).`
          : `${res.algorithmName}: шлях до цілі заблоковано перешкодами!`
      );
      return;
    }

    setSimState('running');
    setStatusMessage(`Виконується візуалізація: ${res.algorithmName}...`);

    res.visitedOrder.forEach((node, idx) => {
      const id = setTimeout(() => {
        setVisitedCells((prev) => new Set(prev).add(`${node.row},${node.col}`));
      }, idx * speedMs);
      timersRef.current.push(id);
    });

    const totalVisitTime = res.visitedOrder.length * speedMs;

    if (res.found) {
      res.path.forEach((node, idx) => {
        const id = setTimeout(() => {
          setPathCells((prev) => new Set(prev).add(`${node.row},${node.col}`));
        }, totalVisitTime + idx * (speedMs + 10));
        timersRef.current.push(id);
      });
    }

    const finishId = setTimeout(() => {
      setSimState('completed');
      setStatusMessage(
        res.found
          ? `${res.algorithmName}: шлях знайдено (${res.pathLength} кроків, відвідано ${res.visitedCount} вузлів).`
          : `${res.algorithmName}: шлях до цілі заблоковано перешкодами!`
      );
    }, totalVisitTime + res.path.length * (speedMs + 10) + 20);
    timersRef.current.push(finishId);
  };

  const handleCompareAll = () => {
    resetVisualization();
    const allRes = runAllComparisons({
      rows: dimensions.rows,
      cols: dimensions.cols,
      walls,
      start,
      end,
      heuristicType: heuristic
    });
    setComparisonResults(allRes);

    // Показуємо на сітці результат поточного обраного алгоритму
    const current = allRes.find((r) => r.algorithmId === selectedAlg) || allRes[0];
    setVisitedCells(new Set(current.visitedOrder.map((p) => `${p.row},${p.col}`)));
    setPathCells(new Set(current.path.map((p) => `${p.row},${p.col}`)));
    setSimState('completed');
    setStatusMessage('Порівняльний аналіз усіх 4 алгоритмів завершено.');
  };

  const handleExportCSV = () => {
    if (comparisonResults.length === 0) return;
    const header = 'Алгоритм;Статус;Довжина шляху (кроків);Відвідано вузлів;Час виконання (мс);Оптимальність\n';
    const rowsCsv = comparisonResults
      .map(
        (r) =>
          `${r.algorithmName};${r.found ? 'Знайдено' : 'Не знайдено'};${r.pathLength};${r.visitedCount};${r.executionTimeMs};${r.optimal ? 'Так' : 'Ні'}`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rowsCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pathfinding_comparison_${dimensions.rows}x${dimensions.cols}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxVisited = Math.max(1, ...comparisonResults.map((r) => r.visitedCount));

  return (
    <div className="app-container" onMouseUp={() => setIsMouseDown(false)}>
      <header className="app-header">
        <div>
          <h1>Глобальний пошук шляху в середовищах із перешкодами</h1>
          <p className="subtitle">
            Інтерактивна симуляція та порівняльний аналіз алгоритмів A*, Дейкстри, BFS і Greedy
          </p>
        </div>
        <span className={`state-badge state-${simState}`}>
          Стан: {simState === 'idle' ? 'Очікування' : simState === 'running' ? 'Симуляція...' : 'Завершено'}
        </span>
      </header>

      <section className="controls-panel" aria-label="Панель керування симуляцією">
        <div className="control-group">
          <label htmlFor="alg-select">Алгоритм:</label>
          <select
            id="alg-select"
            value={selectedAlg}
            onChange={(e) => setSelectedAlg(e.target.value)}
            disabled={simState === 'running'}
          >
            {Object.values(ALGORITHMS).map((alg) => (
              <option key={alg.id} value={alg.id}>
                {alg.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="heur-select">Евристика (A*/Greedy):</label>
          <select
            id="heur-select"
            value={heuristic}
            onChange={(e) => setHeuristic(e.target.value)}
            disabled={simState === 'running'}
          >
            <option value="manhattan">Манхеттенська (L1)</option>
            <option value="euclidean">Евклідова (L2)</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="size-select">Розмір поля:</label>
          <select
            id="size-select"
            value={`${dimensions.rows}x${dimensions.cols}`}
            onChange={(e) => {
              const [r, c] = e.target.value.split('x').map(Number);
              handleGridSizeChange(r, c);
            }}
            disabled={simState === 'running'}
          >
            <option value="10x16">Мале (10 × 16)</option>
            <option value="15x25">Середнє (15 × 25)</option>
            <option value="20x35">Велике (20 × 35)</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="speed-select">Швидкість анімації:</label>
          <select
            id="speed-select"
            value={speedMs}
            onChange={(e) => setSpeedMs(Number(e.target.value))}
            disabled={simState === 'running'}
          >
            <option value={35}>Повільно</option>
            <option value={18}>Середньо</option>
            <option value={5}>Швидко</option>
            <option value={0}>Миттєво</option>
          </select>
        </div>

        <div className="control-group">
          <label>Режим редагування:</label>
          <div className="btn-group">
            <button
              type="button"
              className={drawMode === 'wall' ? 'active' : ''}
              onClick={() => setDrawMode('wall')}
              disabled={simState === 'running'}
            >
              Перешкода
            </button>
            <button
              type="button"
              className={drawMode === 'start' ? 'active' : ''}
              onClick={() => setDrawMode('start')}
              disabled={simState === 'running'}
            >
              Старт
            </button>
            <button
              type="button"
              className={drawMode === 'end' ? 'active' : ''}
              onClick={() => setDrawMode('end')}
              disabled={simState === 'running'}
            >
              Фініш
            </button>
          </div>
        </div>

        <div className="action-buttons">
          <button
            type="button"
            className="btn-primary"
            onClick={handleVisualizeSingle}
            disabled={simState === 'running'}
          >
            Запустити {ALGORITHMS[selectedAlg].name}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCompareAll}
            disabled={simState === 'running'}
          >
            Порівняти всі 4 алгоритми
          </button>
          <button
            type="button"
            onClick={handleGenerateMaze}
            disabled={simState === 'running'}
          >
            Випадкові перешкоди
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={simState === 'running'}
          >
            Очистити
          </button>
        </div>
      </section>

      <div className="info-bar">
        <p className="status-text">{statusMessage}</p>
        <div className="legend">
          <span><i className="box start"></i> Старт</span>
          <span><i className="box end"></i> Фініш</span>
          <span><i className="box wall"></i> Перешкода</span>
          <span><i className="box visited"></i> Досліджено</span>
          <span><i className="box path"></i> Знайдений шлях</span>
        </div>
      </div>

      <main className="workspace">
        <div
          className="grid-board"
          style={{ gridTemplateColumns: `repeat(${dimensions.cols}, 1fr)` }}
          role="grid"
          aria-label="Сітка середовища з перешкодами"
        >
          {walls.map((rowArr, r) =>
            rowArr.map((isWall, c) => {
              const key = `${r},${c}`;
              const isStart = r === start.row && c === start.col;
              const isEnd = r === end.row && c === end.col;
              const isPath = pathCells.has(key);
              const isVisited = visitedCells.has(key);

              let cellClass = 'grid-cell';
              if (isStart) cellClass += ' cell-start';
              else if (isEnd) cellClass += ' cell-end';
              else if (isWall) cellClass += ' cell-wall';
              else if (isPath) cellClass += ' cell-path';
              else if (isVisited) cellClass += ' cell-visited';

              return (
                <div
                  key={key}
                  className={cellClass}
                  onMouseDown={() => {
                    setIsMouseDown(true);
                    applyCellAction(r, c, true);
                  }}
                  onMouseEnter={() => {
                    if (isMouseDown && drawMode === 'wall') {
                      applyCellAction(r, c, false);
                    }
                  }}
                  title={`(${r}, ${c})`}
                />
              );
            })
          )}
        </div>

        <aside className="analysis-panel">
          <div className="analysis-header">
            <h2>Порівняльний аналіз</h2>
            {comparisonResults.length > 0 && (
              <button type="button" className="btn-export" onClick={handleExportCSV}>
                Експорт CSV
              </button>
            )}
          </div>

          <p className="alg-hint">{ALGORITHMS[selectedAlg].description}</p>

          {comparisonResults.length === 0 ? (
            <p className="empty-hint">
              Натисніть <b>«Порівняти всі 4 алгоритми»</b>, щоб отримати порівняльну таблицю ефективності на поточній карті.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>Алгоритм</th>
                    <th>Шлях (кроків)</th>
                    <th>Відвідано вузлів</th>
                    <th>Час (мс)</th>
                    <th>Оптим.</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.map((res) => (
                    <tr
                      key={res.algorithmId}
                      className={res.algorithmId === selectedAlg ? 'row-selected' : ''}
                    >
                      <td><strong>{res.algorithmName}</strong></td>
                      <td>{res.found ? res.pathLength : '—'}</td>
                      <td>
                        <div className="bar-cell">
                          <span>{res.visitedCount}</span>
                          <div className="mini-bar">
                            <div
                              className="mini-bar-fill"
                              style={{ width: `${(res.visitedCount / maxVisited) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>{res.executionTimeMs}</td>
                      <td>{res.optimal ? 'Так' : 'Ні'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}