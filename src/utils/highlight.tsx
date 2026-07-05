import React from 'react';

/**
 * Highlights specific keywords within a given text block.
 * @param text The full text (e.g., basisText).
 * @param keywords An array of strings to highlight.
 * @returns React node with highlighted parts.
 */
export function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords || keywords.length === 0 || !text) {
    return <>{text}</>;
  }

  // 정규식에 사용되는 특수문자 이스케이프 처리
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = keywords.some(
          (kw) => kw.toLowerCase() === part.toLowerCase()
        );
        return isMatch ? (
          <mark key={i} className="bg-yellow-200 font-bold text-gray-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </>
  );
}
