"use client";

// Lightweight, dependency-free Markdown renderer for the AI Coach.
// Supports headings, paragraphs, bold/italic/code, links, bullet and numbered
// lists (one level of nesting), tables, blockquotes, rules and code blocks.
// All text is HTML-escaped before inline formatting is applied, so model output
// can never inject markup. Links are never rendered as clickable anchors.

import { Fragment, type ReactNode } from "react";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string): string {
  const codes: string[] = [];
  return escapeHtml(s)
    // Protect inline code from further formatting.
    .replace(/`([^`]+)`/g, (_m, c: string) => `\u0000${codes.push(c) - 1}\u0000`)
    // Links are shown as text with their destination, never as clickable
    // anchors: a manipulated answer can't hide a data-leaking URL behind a label.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) => {
      let host = url;
      try { host = new URL(url.replace(/&amp;/g, "&")).hostname; } catch {}
      return `${label} <span class="text-stone-500 text-[0.85em]">(${host})</span>`;
    })
    .replace(/\bhttps?:\/\/[^\s<)]+/g, (url: string) => {
      try { return `<span class="text-stone-400">${new URL(url.replace(/&amp;/g, "&")).hostname}</span>`; } catch { return ""; }
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/(^|\s)__([^_]+)__(?=\s|[.,;:!?]|$)/g, '$1<strong class="font-semibold text-white">$2</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\s][^_\n]*?)_(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>")
    .replace(/\u0000(\d+)\u0000/g, (_m, n: string) => `<code class="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-[0.85em] text-indigo-200 font-mono">${codes[Number(n)]}</code>`);
}

const Inline = ({ text, className }: { text: string; className?: string }) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: inline(text) }} />
);

const LIST_RE = /^(\s*)([-*•+]|\d+[.)])\s+(.*)$/;
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

interface ListItem { text: string; children: { text: string; ordered: boolean }[] }

export default function ChatMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === "") { i++; continue; }

    // Fenced code block
    if (t.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
      i++;
      out.push(
        <pre key={key++} className="my-3 overflow-x-auto rounded-xl bg-black/40 border border-white/[0.08] p-4 text-[13px] leading-relaxed font-mono text-stone-200">
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      const level = h[1].length;
      const cls = level <= 2
        ? "text-lg font-semibold text-white mt-5 mb-2 first:mt-0"
        : "text-[15px] font-semibold text-white mt-4 mb-1.5 first:mt-0";
      out.push(<h3 key={key++} className={cls}><Inline text={h[2].replace(/#+\s*$/, "")} /></h3>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      out.push(<hr key={key++} className="my-4 border-white/[0.08]" />);
      i++;
      continue;
    }

    // Table
    if (t.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|") && lines[i].trim() !== "") rows.push(splitRow(lines[i++]));
      out.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04]">
              <tr>{head.map((c, j) => <th key={j} className="text-left font-semibold text-stone-200 px-3 py-2 border-b border-white/[0.08]"><Inline text={c} /></th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-white/[0.05] last:border-0">
                  {head.map((_, j) => <td key={j} className="px-3 py-2 text-stone-300 align-top"><Inline text={r[j] ?? ""} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote
    if (t.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) body.push(lines[i++].trim().replace(/^>\s?/, ""));
      out.push(
        <blockquote key={key++} className="my-3 border-l-2 border-indigo-400/60 pl-4 text-stone-300">
          <Inline text={body.join(" ")} />
        </blockquote>,
      );
      continue;
    }

    // Lists (one level of nesting)
    const lm = LIST_RE.exec(line);
    if (lm) {
      const ordered = /\d/.test(lm[2]);
      const start = ordered ? parseInt(lm[2], 10) || 1 : 1;
      const baseIndent = lm[1].length;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = LIST_RE.exec(lines[i]);
        if (m) {
          if (m[1].length > baseIndent + 1 && items.length) {
            items[items.length - 1].children.push({ text: m[3], ordered: /\d/.test(m[2]) });
          } else if (/\d/.test(m[2]) === ordered) {
            items.push({ text: m[3], children: [] });
          } else break;
          i++;
        } else if (lines[i].trim() !== "" && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1].text += " " + lines[i].trim(); // wrapped continuation
          i++;
        } else break;
      }
      const ListTag = ordered ? "ol" : "ul";
      out.push(
        <ListTag key={key++} start={ordered ? start : undefined} className={`my-2 space-y-1.5 pl-6 ${ordered ? "list-decimal marker:text-stone-400" : "list-disc marker:text-indigo-400"}`}>
          {items.map((it, j) => (
            <li key={j} className="pl-1 leading-relaxed">
              <Inline text={it.text} />
              {it.children.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-5 list-[circle] marker:text-stone-500">
                  {it.children.map((c, k) => <li key={k} className="pl-1"><Inline text={c.text} /></li>)}
                </ul>
              )}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    // Paragraph: gather until a blank line or another block starts
    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      const lt = l.trim();
      if (lt === "" || lt.startsWith("```") || /^#{1,6}\s/.test(lt) || LIST_RE.test(l) || lt.startsWith(">") ||
          (lt.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))) break;
      para.push(lt);
      i++;
    }
    if (para.length) {
      out.push(
        <p key={key++} className="my-2.5 first:mt-0 last:mb-0 leading-relaxed">
          {para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={p} /></Fragment>)}
        </p>,
      );
    } else {
      i++; // safety: never loop forever on an unrecognised line
    }
  }

  return <div className="text-[15px] text-stone-200">{out}</div>;
}

/** Split the model's hidden "FOLLOWUPS:" line from the visible answer. Safe mid-stream. */
export function splitFollowups(raw: string): { body: string; followups: string[] } {
  const idx = raw.search(/(^|\n)\s*\**FOLLOWUPS:?\**/i);
  if (idx >= 0) {
    const body = raw.slice(0, idx).trimEnd();
    const tail = raw.slice(idx).replace(/^\s*\**FOLLOWUPS:?\**\s*/i, "");
    const followups = tail.split("|").map((q) => q.replace(/^[-*\d.)\s]+/, "").trim()).filter((q) => q.length > 3 && q.length < 140).slice(0, 3);
    return { body, followups };
  }
  // While streaming, hide a last line that is still spelling out "FOLLOWUPS".
  const lastNl = raw.lastIndexOf("\n");
  const last = raw.slice(lastNl + 1).trim().replace(/\*/g, "");
  if (last.length > 0 && last.length < 10 && "FOLLOWUPS:".startsWith(last.toUpperCase())) {
    return { body: raw.slice(0, lastNl + 1).trimEnd(), followups: [] };
  }
  return { body: raw, followups: [] };
}
