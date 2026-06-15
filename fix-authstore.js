const fs = require('fs');
let code = fs.readFileSync('src/store/authStore.ts', 'utf8');

// The vars are likely in handleVerifyOTP
code = code.replace(/catch \(_e\)/g, 'catch (e)'); // Revert my previous regex which might be too broad
code = code.replace(/catch \(_error\)/g, 'catch (error)');

fs.writeFileSync('src/store/authStore.ts', code);
