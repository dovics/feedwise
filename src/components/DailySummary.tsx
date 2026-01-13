"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";

interface DailySummaryData {
  id: string;
  date: string;
  content: string;
  language: string;
  itemCount: number;
}

interface DailySummaryProps {
  summary: DailySummaryData | null;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onRegenerate?: () => void;
  streamingContent?: string;
  isStreaming?: boolean;
}

export function DailySummary({ summary, loading, error, onRefresh, onRegenerate, streamingContent, isStreaming }: DailySummaryProps) {
  const t = useTranslations();
  const tSummary = useTranslations('summary');
  const [expanded, setExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current && expanded) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingContent, isStreaming, expanded]);

  // Show if there's a summary, loading, streaming, or there's an error
  if (!summary && !loading && !error && !streamingContent) {
    return null;
  }

  const summaryDate = summary ? new Date(summary.date) : new Date();
  const formattedDate = summaryDate.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="bg-theme-surface backdrop-blur-sm rounded-lg shadow-theme border border-theme mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-theme-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-accent/20 rounded-lg">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">
                {tSummary('title')}
              </h2>
              <p className="text-sm text-theme-secondary">
                {formattedDate}
                {summary && ` • ${tSummary('itemCount', { count: summary.itemCount })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading || isStreaming}
              className="px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={tSummary('refresh')}
            >
              {(loading || isStreaming) ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {tSummary('generating')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {tSummary('refresh')}
                </>
              )}
            </button>
            {summary && onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={loading || isStreaming}
                className="px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={tSummary('regenerate')}
              >
                {(loading || isStreaming) ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {tSummary('generating')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {tSummary('regenerate')}
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-2 text-theme-secondary hover:bg-theme-surface/50 rounded-md transition-colors"
              title={expanded ? "收起" : "展开"}
            >
              <svg
                className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-6 py-4" ref={contentRef}>
          {error && (
            <div className="flex items-start gap-3 py-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <svg
                className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-red-900 dark:text-red-300 font-medium mb-1">
                  {tSummary('generationError')}
                </p>
                <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}
          {loading && !summary && !error && !isStreaming ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-theme-secondary">
                <svg
                  className="animate-spin h-5 w-5 text-accent"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>{tSummary('generating')}</span>
              </div>
            </div>
          ) : (streamingContent || summary) ? (
            <div className="prose prose-blue dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => (
                    <h2 className="text-lg font-bold text-theme-primary mt-4 mb-2 first:mt-0" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-base font-semibold text-theme-primary mt-3 mb-2" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-theme-primary my-2 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside text-theme-primary my-2 space-y-1" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-theme-primary" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-theme-primary" {...props} />
                  )
                }}
              >
                {streamingContent || summary?.content || ''}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-5 bg-accent ml-1 animate-pulse" />
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
