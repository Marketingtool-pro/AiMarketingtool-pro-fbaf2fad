const fs = require('fs');
let code = fs.readFileSync('src/components/common/AnimatedBackground.tsx', 'utf8');

code = code.replace(
  '  const translateY = React.useRef(new RNAnimated.Value(0)).current;\n  const translateX = React.useRef(new RNAnimated.Value(0)).current;\n  const opacity = React.useRef(new RNAnimated.Value(0)).current;\n  const scale = React.useRef(new RNAnimated.Value(0.5)).current;',
  `  const [translateY] = React.useState(() => new RNAnimated.Value(0));
  const [translateX] = React.useState(() => new RNAnimated.Value(0));
  const [opacity] = React.useState(() => new RNAnimated.Value(0));
  const [scale] = React.useState(() => new RNAnimated.Value(0.5));`
);

fs.writeFileSync('src/components/common/AnimatedBackground.tsx', code);
