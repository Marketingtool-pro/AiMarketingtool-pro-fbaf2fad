const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/SplashScreen.tsx', 'utf8');

code = code.replace(
  '  const scaleAnim = useRef(new Animated.Value(0.9)).current;\n  const opacityAnim = useRef(new Animated.Value(0)).current;\n  const glowAnim = useRef(new Animated.Value(0.4)).current;',
  `  const [scaleAnim] = useState(() => new Animated.Value(0.9));
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [glowAnim] = useState(() => new Animated.Value(0.4));`
);

code = code.replace(
  "import React, { useEffect, useRef } from 'react';",
  "import React, { useEffect, useState } from 'react';"
);

fs.writeFileSync('src/screens/auth/SplashScreen.tsx', code);
