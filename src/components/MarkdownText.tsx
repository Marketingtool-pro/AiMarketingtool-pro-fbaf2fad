import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { Colors, Spacing } from '../constants/theme';

/**
 * MarkdownText — renders AI tool output as formatted rich text instead of raw
 * markdown source (owner requirement: results must look like the web app, not
 * chat text). Pure React Native <Text>/<View> — no WebView, no new native
 * dependency, so it cannot affect the build. Supports the constructs the AI
 * backend actually emits: #/##/### headings, **bold**, *italic*, `inline code`,
 * ``` code blocks, -/* bullets, 1. numbered lists, --- rules, and | tables.
 */

// Split a line into Text segments honoring **bold**, *italic*, `code`.
function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenize: **bold** | *italic* | `code`
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      nodes.push(<Text key={`${keyPrefix}-t${i++}`}>{line.slice(last, m.index)}</Text>);
    }
    const tok = m[0];
    if (tok.startsWith('**')) {
      nodes.push(<Text key={`${keyPrefix}-b${i++}`} style={styles.bold}>{tok.slice(2, -2)}</Text>);
    } else if (tok.startsWith('`')) {
      nodes.push(<Text key={`${keyPrefix}-c${i++}`} style={styles.inlineCode}>{tok.slice(1, -1)}</Text>);
    } else {
      nodes.push(<Text key={`${keyPrefix}-i${i++}`} style={styles.italic}>{tok.slice(1, -1)}</Text>);
    }
    last = m.index + tok.length;
  }
  if (last < line.length) {
    nodes.push(<Text key={`${keyPrefix}-t${i++}`}>{line.slice(last)}</Text>);
  }
  return nodes;
}

interface Props {
  content: string;
  /** Cap rendering to roughly this many characters (collapsed preview). */
  maxChars?: number;
  textStyle?: TextStyle;
}

const MarkdownText: React.FC<Props> = ({ content, maxChars, textStyle }) => {
  const source = maxChars && content.length > maxChars
    ? content.slice(0, maxChars) + '…'
    : content;
  const lines = source.split('\n');
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  lines.forEach((raw, idx) => {
    const key = `md-${idx}`;
    const line = raw.replace(/\s+$/, '');

    // fenced code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push(
          <View key={key} style={styles.codeBlock}>
            <Text style={styles.codeText}>{codeLines.join('\n')}</Text>
          </View>
        );
        codeLines = [];
      }
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) { codeLines.push(raw); return; }

    // horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<View key={key} style={styles.hr} />);
      return;
    }
    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
      blocks.push(<Text key={key} style={[style, textStyle]}>{renderInline(h[2], key)}</Text>);
      return;
    }
    // table row — render as aligned monospace-ish row (skip separator rows)
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (/^\s*\|[\s\-:|]+\|\s*$/.test(line)) return; // |---|---| separator
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
      blocks.push(
        <View key={key} style={styles.tableRow}>
          {cells.map((c, ci) => (
            <Text key={`${key}-c${ci}`} style={[styles.tableCell, textStyle]}>
              {renderInline(c, `${key}-c${ci}`)}
            </Text>
          ))}
        </View>
      );
      return;
    }
    // bullet list
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <View key={key} style={styles.listRow}>
          <Text style={[styles.bulletDot, textStyle]}>{'•'}</Text>
          <Text style={[styles.body, styles.listText, textStyle]}>{renderInline(bullet[1], key)}</Text>
        </View>
      );
      return;
    }
    // numbered list
    const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (num) {
      blocks.push(
        <View key={key} style={styles.listRow}>
          <Text style={[styles.bulletDot, textStyle]}>{num[1]}.</Text>
          <Text style={[styles.body, styles.listText, textStyle]}>{renderInline(num[2], key)}</Text>
        </View>
      );
      return;
    }
    // blank line = paragraph gap
    if (line.trim() === '') {
      blocks.push(<View key={key} style={styles.gap} />);
      return;
    }
    // plain paragraph line
    blocks.push(<Text key={key} style={[styles.body, textStyle]}>{renderInline(line, key)}</Text>);
  });

  // unclosed code block at EOF
  if (inCodeBlock && codeLines.length) {
    blocks.push(
      <View key="md-eof-code" style={styles.codeBlock}>
        <Text style={styles.codeText}>{codeLines.join('\n')}</Text>
      </View>
    );
  }

  return <View>{blocks}</View>;
};

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', color: Colors.white, marginTop: Spacing.md, marginBottom: Spacing.sm, lineHeight: 30 },
  h2: { fontSize: 19, fontWeight: '700', color: Colors.white, marginTop: Spacing.md, marginBottom: Spacing.xs, lineHeight: 26 },
  h3: { fontSize: 16, fontWeight: '600', color: Colors.white, marginTop: Spacing.sm, marginBottom: Spacing.xs, lineHeight: 22 },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  bold: { fontWeight: '700', color: Colors.white },
  italic: { fontStyle: 'italic' },
  inlineCode: { fontFamily: 'Menlo', fontSize: 13, color: Colors.secondary, backgroundColor: 'rgba(255,255,255,0.08)' },
  codeBlock: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: Spacing.sm, marginVertical: Spacing.xs },
  codeText: { fontFamily: 'Menlo', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  hr: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: Spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingLeft: 2 },
  bulletDot: { color: Colors.secondary, fontSize: 14, lineHeight: 22, marginRight: 8, minWidth: 16 },
  listText: { flex: 1 },
  gap: { height: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)', paddingVertical: 6 },
  tableCell: { flex: 1, fontSize: 13, color: Colors.textSecondary, paddingRight: 8 },
});

export default MarkdownText;
