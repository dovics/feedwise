"use client";

import { useTranslations } from "next-intl";

interface AddFeedFormProps {
  newFeedUrl: string;
  loading: boolean;
  error: string;
  onAddFeed: (e: React.FormEvent) => void;
  onUrlChange: (url: string) => void;
}

export function AddFeedForm({
  newFeedUrl,
  loading,
  error,
  onAddFeed,
  onUrlChange,
}: AddFeedFormProps) {
  const tHome = useTranslations('home');

  return (
    <div className="bg-theme-surface backdrop-blur-sm rounded-lg shadow-theme border border-theme p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4 text-theme-primary">
        {tHome('addFeed.title')}
      </h2>
      <form onSubmit={onAddFeed} className="space-y-3" noValidate>
        <label htmlFor="feed-url" className="sr-only">
          {tHome('addFeed.placeholder')}
        </label>
        <input
          id="feed-url"
          type="url"
          name="feed-url"
          inputMode="url"
          placeholder={tHome('addFeed.placeholder')}
          value={newFeedUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full px-3 py-2 border border-theme rounded-md focus-ring bg-theme-surface text-theme-primary placeholder-theme-muted"
          required
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "feed-url-error" : undefined}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-accent hover:bg-opacity-80 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-busy={loading}
        >
          {loading ? tHome('addFeed.adding') : tHome('addFeed.button')}
        </button>
      </form>

      {error && (
        <div
          id="feed-url-error"
          className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-900 dark:text-red-300">
                {tHome('addFeed.error.required')}
              </p>
              <p className="text-sm text-red-800 dark:text-red-400 mt-1 break-words">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
