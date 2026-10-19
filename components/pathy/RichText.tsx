import Link from 'next/link';
import { Fragment } from 'react';

/**
 * Pathy's replies, formatted. A deliberately tiny subset of Markdown: lines
 * starting "- " become a list, **bold** is bold, [text](link) is a link.
 *
 * Model output is untrusted, so nothing is ever inserted as HTML: every piece
 * becomes a React text node. A link is kept only if it is a Pathora page
 * ("/...") or an https address; anything else is shown as plain text.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g;

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(INLINE).map((part, i) => {
        const bold = /^\*\*([^*]+)\*\*$/.exec(part);
        if (bold) return <strong key={i} className="font-semibold">{bold[1]}</strong>;

        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          const [, label, href] = link;
          if (href.startsWith('/') && !href.startsWith('//')) {
            return (
              <Link key={i} href={href} className="font-medium text-navy underline underline-offset-2">
                {label}
              </Link>
            );
          }
          if (/^https:\/\/\S+$/.test(href)) {
            return (
              <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-navy underline underline-offset-2">
                {label}
              </a>
            );
          }
          return <Fragment key={i}>{label}</Fragment>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export default function RichText({ text }: { text: string }) {
  // Blocks: runs of "- " lines become a list; other lines become paragraphs.
  const blocks: { kind: 'p' | 'ul'; lines: string[] }[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] });
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const kind = bullet ? 'ul' : 'p';
    const content = bullet ? bullet[1] : line.trim();
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind && (kind === 'ul' || last.lines.length > 0)) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {blocks
        .filter((b) => b.lines.length > 0)
        .map((b, i) =>
          b.kind === 'ul' ? (
            <ul key={i} className="flex flex-col gap-1.5">
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" aria-hidden="true" />
                  <span>
                    <Inline text={l} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Inline text={l} />
                </Fragment>
              ))}
            </p>
          ),
        )}
    </div>
  );
}
