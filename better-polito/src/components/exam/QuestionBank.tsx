'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ListChecks,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  BankQuestion,
  Difficulty,
  ExamMode,
  LanguageFilter,
  QuestionFacets,
  SubjectConfig,
} from '@/types/exam';
import { saveAttempt, type Attempt } from '@/lib/exam/attempt';
import { MathText } from './MathText';

interface Props {
  subject: SubjectConfig;
  questions: BankQuestion[];
  facets: QuestionFacets;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_COLORS: Record<Difficulty, { bg: string; fg: string; bd: string }> = {
  easy: { bg: 'var(--diff-easy-bg, #e6f7ec)', fg: 'var(--diff-easy-fg, #1b7a3f)', bd: 'var(--diff-easy-bd, #b6e3c8)' },
  medium: { bg: 'var(--diff-medium-bg, #fff3e0)', fg: 'var(--diff-medium-fg, #a55a00)', bd: 'var(--diff-medium-bd, #ffd9a8)' },
  hard: { bg: 'var(--diff-hard-bg, #fde8e8)', fg: 'var(--diff-hard-fg, #9b1c1c)', bd: 'var(--diff-hard-bd, #f5b8b8)' },
};

const LANGUAGE_LABELS: Record<LanguageFilter, string> = {
  any: 'Any',
  it: 'Italian',
  en: 'English',
};

export function QuestionBank({ subject, questions, facets }: Props) {
  const router = useRouter();

  // Sidebar facet filters
  const [topicFilter, setTopicFilter] = useState<string[]>([]);
  const [diffFilter, setDiffFilter] = useState<Difficulty[]>([]);
  const [langFilter, setLangFilter] = useState<LanguageFilter>('any');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Submission state
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  // Apply sidebar facet filters first
  const sideFiltered = useMemo(() => {
    let out = questions;
    if (topicFilter.length > 0) {
      const tf = new Set(topicFilter);
      out = out.filter((q) => q.topics?.some((t) => tf.has(t)));
    }
    if (diffFilter.length > 0) {
      const df = new Set(diffFilter);
      out = out.filter((q) => df.has(q.difficulty));
    }
    if (langFilter !== 'any') {
      out = out.filter((q) => q.language === langFilter);
    }
    return out;
  }, [questions, topicFilter, diffFilter, langFilter]);

  const columns = useMemo<ColumnDef<BankQuestion>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: 'ID',
        size: 130,
        cell: ({ getValue }) => {
          const v = getValue<string>();
          return (
            <span
              title={v}
              style={{ fontFamily: 'monospace', fontSize: 12, color: '#495057' }}
            >
              {v.split('-')[0]}
            </span>
          );
        },
      },
      {
        id: 'preview',
        accessorKey: 'question_text',
        header: 'Preview',
        size: 520,
        cell: ({ row }) => {
          const q = row.original;
          const clean = q.question_text
            .replace(/<br\s*\/?>(?=\s|$)/gi, ' ')
            .replace(/<[^>]*>/g, '')
            .trim();
          const trimmed = clean.length > 180 ? `${clean.slice(0, 180)}…` : clean;
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 13,
              }}
              title={clean}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <MathText text={trimmed} />
              </span>
              {q.has_formula && (
                <span title="Contains formula" style={{ color: '#f7941d', fontWeight: 700 }}>
                  ∑
                </span>
              )}
              {q.has_diagram && (
                <span title="Contains image" style={{ fontSize: 12 }}>
                  🖼️
                </span>
              )}
            </div>
          );
        },
        filterFn: (row, _id, value) => {
          if (!value) return true;
          const s = String(value).toLowerCase();
          return (
            row.original.question_text.toLowerCase().includes(s) ||
            row.original.id.toLowerCase().includes(s)
          );
        },
      },
      {
        id: 'difficulty',
        accessorKey: 'difficulty',
        header: 'Difficulty',
        size: 110,
        cell: ({ getValue }) => {
          const d = getValue<Difficulty>();
          const c = DIFFICULTY_COLORS[d];
          return (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                background: c.bg,
                color: c.fg,
                border: `1px solid ${c.bd}`,
              }}
            >
              {DIFFICULTY_LABELS[d]}
            </span>
          );
        },
        filterFn: 'equals',
        sortingFn: (a, b) => {
          const order: Difficulty[] = ['easy', 'medium', 'hard'];
          return (
            order.indexOf(a.original.difficulty) -
            order.indexOf(b.original.difficulty)
          );
        },
      },
      {
        id: 'language',
        accessorKey: 'language',
        header: 'Lang',
        size: 70,
        cell: ({ getValue }) => (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#495057' }}>
            {getValue<string>().toUpperCase()}
          </span>
        ),
        filterFn: 'equals',
      },
      {
        id: 'topics',
        accessorKey: 'topics',
        header: 'Topics',
        size: 240,
        enableSorting: false,
        cell: ({ getValue }) => {
          const topics = getValue<string[]>() ?? [];
          if (topics.length === 0) return null;
          return (
            <div
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'nowrap',
                overflow: 'hidden',
              }}
              title={topics.join(', ')}
            >
              {topics.slice(0, 2).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    background: 'var(--topic-bg, #eef2ff)',
                    color: 'var(--topic-fg, #3730a3)',
                    border: '1px solid var(--topic-bd, #c7d2fe)',
                    borderRadius: 10,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t}
                </span>
              ))}
              {topics.length > 2 && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    background: 'var(--topic-more-bg, #f1f3f5)',
                    color: 'var(--topic-more-fg, #495057)',
                    border: '1px solid var(--topic-more-bd, #dee2e6)',
                    borderRadius: 10,
                  }}
                >
                  +{topics.length - 2}
                </span>
              )}
            </div>
          );
        },
        filterFn: (row, _id, value) => {
          if (!value) return true;
          const s = String(value).toLowerCase();
          return (row.original.topics ?? []).some((t) =>
            t.toLowerCase().includes(s),
          );
        },
      },
      {
        id: 'year',
        accessorKey: 'year',
        header: 'Year',
        size: 80,
        cell: ({ getValue }) => (
          <span style={{ fontSize: 12, color: '#6c757d' }}>{String(getValue() ?? '—')}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: sideFiltered,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    globalFilterFn: (row, _id, value) => {
      if (!value) return true;
      const s = String(value).toLowerCase();
      return (
        row.original.id.toLowerCase().includes(s) ||
        row.original.question_text.toLowerCase().includes(s) ||
        (row.original.topics ?? []).some((t) => t.toLowerCase().includes(s))
      );
    },
  });

  const rows = table.getRowModel().rows;
  const visibleIds = useMemo(() => rows.map((r) => r.original.id), [rows]);

  // Virtualizer
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  const headerCheckState: 'all' | 'some' | 'none' = (() => {
    if (visibleIds.length === 0) return 'none';
    const sel = visibleIds.filter((id) => selected.has(id)).length;
    if (sel === 0) return 'none';
    if (sel === visibleIds.length) return 'all';
    return 'some';
  })();

  function toggleSelectAllVisible() {
    if (headerCheckState === 'all') {
      const next = new Set(selected);
      visibleIds.forEach((id) => next.delete(id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      visibleIds.forEach((id) => next.add(id));
      setSelected(next);
    }
  }

  function toggleRow(id: string, event?: React.MouseEvent) {
    const next = new Set(selected);
    if (event?.shiftKey && lastSelectedId && lastSelectedId !== id) {
      const start = visibleIds.indexOf(lastSelectedId);
      const end = visibleIds.indexOf(id);
      if (start !== -1 && end !== -1) {
        const [lo, hi] = start < end ? [start, end] : [end, start];
        const target = !next.has(id);
        for (let i = lo; i <= hi; i++) {
          if (target) next.add(visibleIds[i]);
          else next.delete(visibleIds[i]);
        }
        setSelected(next);
        setLastSelectedId(id);
        return;
      }
    }
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setLastSelectedId(id);
  }

  function toggleTopic(t: string) {
    setTopicFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function toggleDiff(d: Difficulty) {
    setDiffFilter((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function clearAllFilters() {
    setTopicFilter([]);
    setDiffFilter([]);
    setLangFilter('any');
    setGlobalFilter('');
    setColumnFilters([]);
    setSorting([]);
  }

  function clearSelection() {
    setSelected(new Set());
    setLastSelectedId(null);
  }

  function selectAllFiltered() {
    setSelected(new Set(visibleIds));
  }

  async function handleStartAttempt() {
    if (selected.size === 0) return;
    setStarting(true);
    setError(null);
    try {
      const mode: ExamMode = 'mcq';
      const modeCfg = subject.modes[mode];

      const config = {
        questionIds: Array.from(selected),
        count: selected.size,
        durationMin: Math.max(1, selected.size * 2),
        shuffleQuestions: true,
        shuffleOptions: false,
        topics: [],
        difficulties: [],
        language: 'any',
        scoring: modeCfg?.scoring ?? { correct: 1, wrong: 0, blank: 0 },
        passScore: modeCfg?.passScore ?? 60,
      };

      const res = await fetch('/api/exam/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.slug, mode, config }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const a: Attempt = {
        subject: subject.slug,
        mode,
        startedAt: data.startedAt ?? Date.now(),
        durationMin: data.durationMin,
        questions: data.questions,
        answers: {},
        flagged: {},
        submittedAt: null,
        scoring: data.scoring,
        passScore: data.passScore,
        attemptToken: data.attemptToken,
      };
      await saveAttempt(a);
      router.push(`/mock/${subject.slug}/${mode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error starting attempt');
      setStarting(false);
    }
  }

  function handleExportPrint(mode: 'practice') {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(',');
    const url = `/mock/${subject.slug}/bank/print?ids=${encodeURIComponent(ids)}&mode=${mode}`;
    window.open(url, '_blank');
  }

  const hasSelected = selected.size > 0;
  const activeFilters =
    topicFilter.length +
    diffFilter.length +
    (langFilter !== 'any' ? 1 : 0) +
    (globalFilter ? 1 : 0) +
    columnFilters.length;

  return (
    <div className="moodle-quiz">
      <link rel="stylesheet" href="/moodle/quiz.css" />
      <link rel="stylesheet" href="/moodle/runner.css" />
      <div className="quiz-breadcrumb">
        <Link href="/mock">Mock exams</Link> <span>/</span>{' '}
        <Link href={`/mock/${subject.slug}`}>{subject.name}</Link> <span>/</span>{' '}
        <span>Question Bank</span>
      </div>
      <h1
        className="quiz-title"
        style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <ListChecks size={32} strokeWidth={2} style={{ color: '#f7941d' }} />
        <span>{subject.name} — Question Bank</span>
      </h1>

      {error && <div className="start-error">{error}</div>}

      <div className="quiz-layout" style={{ gridTemplateColumns: '1fr 300px' }}>
        <div className="quiz-main">
          {/* Toolbar */}
          <div
            className="card-block"
            style={{
              marginBottom: 12,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search id, text, topics…"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 28px 6px 10px',
                  border: '1px solid var(--border, #ced4da)',
                  background: 'var(--input-bg, #fff)',
                  color: 'var(--foreground, inherit)',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              />
              {globalFilter && (
                <button
                  type="button"
                  onClick={() => setGlobalFilter('')}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#868e96',
                    padding: 2,
                    display: 'flex',
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowColumnsMenu((v) => !v)}
              >
                Columns
              </button>
              {showColumnsMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border, #dee2e6)',
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: 8,
                    zIndex: 20,
                    minWidth: 160,
                  }}
                >
                  {table.getAllLeafColumns().map((col) => (
                    <label
                      key={col.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 6px',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{col.id}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {activeFilters > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearAllFilters}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <X size={14} />
                <span>Clear filters ({activeFilters})</span>
              </button>
            )}

            <div
              style={{
                marginLeft: 'auto',
                fontSize: 13,
                color: '#495057',
              }}
            >
              <b>{rows.length}</b> / {questions.length} shown
              {hasSelected && (
                <>
                  {' · '}
                  <b style={{ color: '#f7941d' }}>{selected.size}</b> selected
                </>
              )}
            </div>
          </div>

          {/* Selection action bar */}
          {hasSelected && (
            <div
              className="card-block"
              style={{
                marginBottom: 12,
                padding: 10,
                background: 'var(--highlight-bg, #fff8ee)',
                borderColor: 'var(--primary, #f7941d)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <strong>{selected.size}</strong> selected
              <button
                type="button"
                className="link-btn"
                onClick={selectAllFiltered}
              >
                Select all visible
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={clearSelection}
              >
                Clear
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartAttempt}
                  disabled={starting}
                >
                  {starting ? 'Starting…' : `Start attempt (${selected.size})`}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleExportPrint('practice')}
                >
                  Print Practice
                </button>
              </div>
            </div>
          )}

          {/* Data grid */}
          <div
            className="card-block"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            <div
              ref={parentRef}
              style={{
                overflow: 'auto',
                maxHeight: 'calc(100vh - 280px)',
                width: '100%',
              }}
            >
              <table
                style={{
                  width: table.getCenterTotalSize(),
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  tableLayout: 'fixed',
                  fontSize: 13,
                }}
              >
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: 'var(--table-header-bg, #f8f9fa)',
                  }}
                >
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      <th
                        style={{
                          width: 36,
                          minWidth: 36,
                          textAlign: 'center',
                          padding: '8px 4px',
                          borderBottom: '2px solid var(--border, #dee2e6)',
                          background: 'var(--table-header-bg, #f8f9fa)',
                          position: 'sticky',
                          left: 0,
                          zIndex: 11,
                        }}
                      >
                        <input
                          type="checkbox"
                          ref={(el) => {
                            if (el)
                              el.indeterminate = headerCheckState === 'some';
                          }}
                          checked={headerCheckState === 'all'}
                          onChange={toggleSelectAllVisible}
                          aria-label="Select all visible"
                        />
                      </th>
                      {hg.headers.map((header) => {
                        const sort = header.column.getIsSorted();
                        const canSort = header.column.getCanSort();
                        return (
                          <th
                            key={header.id}
                            style={{
                              width: header.getSize(),
                              padding: '8px 10px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--foreground, #212529)',
                              borderBottom: '2px solid var(--border, #dee2e6)',
                              background: 'var(--table-header-bg, #f8f9fa)',
                              position: 'relative',
                              userSelect: 'none',
                            }}
                          >
                            <div
                              onClick={
                                canSort
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: canSort ? 'pointer' : 'default',
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {canSort && (
                                <span style={{ color: sort ? '#f7941d' : '#adb5bd' }}>
                                  {sort === 'asc' ? (
                                    <ArrowUp size={12} />
                                  ) : sort === 'desc' ? (
                                    <ArrowDown size={12} />
                                  ) : (
                                    <ArrowUpDown size={12} />
                                  )}
                                </span>
                              )}
                            </div>
                            {header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: 0,
                                  height: '100%',
                                  width: 5,
                                  cursor: 'col-resize',
                                  userSelect: 'none',
                                  touchAction: 'none',
                                  background: header.column.getIsResizing()
                                    ? '#f7941d'
                                    : 'transparent',
                                }}
                              />
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {paddingTop > 0 && (
                    <tr>
                      <td colSpan={table.getVisibleLeafColumns().length + 1} style={{ height: paddingTop, padding: 0 }} />
                    </tr>
                  )}
                  {virtualRows.map((vr) => {
                    const row = rows[vr.index];
                    const q = row.original;
                    const isChecked = selected.has(q.id);
                    return (
                      <tr
                        key={row.id}
                        data-index={vr.index}
                        ref={(el) => rowVirtualizer.measureElement(el)}
                        onClick={(e) => toggleRow(q.id, e)}
                        style={{
                          background: isChecked
                            ? 'var(--table-selected-bg, #fff4e1)'
                            : vr.index % 2 === 0
                              ? 'var(--card-bg, #fff)'
                              : 'var(--table-stripe-bg, #fafbfc)',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-light, #f1f3f5)',
                        }}
                      >
                        <td
                          style={{
                            width: 36,
                            minWidth: 36,
                            textAlign: 'center',
                            padding: '6px 4px',
                            position: 'sticky',
                            left: 0,
                            background: isChecked
                              ? 'var(--table-selected-bg, #fff4e1)'
                              : vr.index % 2 === 0
                                ? 'var(--card-bg, #fff)'
                                : 'var(--table-stripe-bg, #fafbfc)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              toggleRow(q.id, e as unknown as React.MouseEvent);
                            }}
                          />
                        </td>
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            style={{
                              width: cell.column.getSize(),
                              padding: '6px 10px',
                              overflow: 'hidden',
                              verticalAlign: 'middle',
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr>
                      <td colSpan={table.getVisibleLeafColumns().length + 1} style={{ height: paddingBottom, padding: 0 }} />
                    </tr>
                  )}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={table.getVisibleLeafColumns().length + 1}
                        style={{
                          textAlign: 'center',
                          padding: 32,
                          color: '#6c757d',
                        }}
                      >
                        No questions match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: '#868e96',
              textAlign: 'right',
            }}
          >
            Tip: click headers to sort · drag column edges to resize · shift-click rows to multi-select
          </div>
        </div>

        <div className="quiz-nav-side">
          <div className="card-block config-card">
            <h3 style={{ marginBottom: 16 }}>Filter Questions</h3>

            <div className="config-section">
              <div className="config-section-head">
                <h3>Topics</h3>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setTopicFilter([])}
                >
                  All
                </button>
              </div>
              <div
                className="chip-group"
                style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}
              >
                {facets.topics.map((t) => (
                  <button
                    type="button"
                    key={t.topic}
                    className={`chip ${topicFilter.includes(t.topic) ? 'chip-active' : ''}`}
                    onClick={() => toggleTopic(t.topic)}
                  >
                    <span className="chip-label">{t.topic}</span>
                    <span className="chip-count">{t.total}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-head">
                <h3>Difficulty</h3>
              </div>
              <div className="chip-group">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    type="button"
                    key={d}
                    className={`chip ${diffFilter.includes(d) ? 'chip-active' : ''}`}
                    onClick={() => toggleDiff(d)}
                  >
                    <span className="chip-label">{DIFFICULTY_LABELS[d]}</span>
                    <span className="chip-count">{facets.difficulties[d]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-head">
                <h3>Language</h3>
              </div>
              <div className="chip-group">
                {(['any', 'it', 'en'] as LanguageFilter[]).map((l) => (
                  <button
                    type="button"
                    key={l}
                    className={`chip ${langFilter === l ? 'chip-active' : ''}`}
                    onClick={() => setLangFilter(l)}
                  >
                    {LANGUAGE_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            <div className="config-hint" style={{ marginTop: 24, textAlign: 'center' }}>
              Showing: <b>{rows.length}</b> out of {questions.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
