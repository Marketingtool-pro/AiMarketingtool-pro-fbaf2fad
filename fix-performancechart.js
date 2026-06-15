const fs = require('fs');
let code = fs.readFileSync('src/components/common/PerformanceChart.tsx', 'utf8');

// remove unused imports
code = code.replace(/import \{ View, Text, StyleSheet, Dimensions, Platform \} from 'react-native';/, "import { View, Text, StyleSheet, Dimensions } from 'react-native';");
code = code.replace("import { Canvas, Path, Skia, LinearGradient, vec, Group, Rect, Text as SkiaText, useFont } from '@shopify/react-native-skia';", "import { Canvas, Path, Skia, LinearGradient, vec, Group, Rect } from '@shopify/react-native-skia';");

// fix conditional hooks
code = code.replace(
  `const PerformanceChart = ({ data, title = 'Activity Trend' }: PerformanceChartProps) => {
  if (!data || data.length < 2) return null;`,
  `const PerformanceChart = ({ data, title = 'Activity Trend' }: PerformanceChartProps) => {
  const hasData = data && data.length >= 2;`
);

code = code.replace(
  `const max = useMemo(() => Math.max(...data.map(d => d.value), 10), [data]);
  const min = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);`,
  `const max = useMemo(() => hasData ? Math.max(...data.map(d => d.value), 10) : 10, [data, hasData]);
  const min = useMemo(() => hasData ? Math.min(...data.map(d => d.value), 0) : 0, [data, hasData]);`
);

code = code.replace(
  `const xStep = (CHART_WIDTH - PADDING * 2) / (data.length - 1);`,
  `if (!hasData) return [];
    const xStep = (CHART_WIDTH - PADDING * 2) / (data.length - 1);`
);

code = code.replace(
  `return (
    <View style={styles.container}>`,
  `if (!hasData) return null;

  return (
    <View style={styles.container}>`
);

fs.writeFileSync('src/components/common/PerformanceChart.tsx', code);
