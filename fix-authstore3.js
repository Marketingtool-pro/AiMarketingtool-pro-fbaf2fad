const fs = require('fs');
let code = fs.readFileSync('src/store/authStore.ts', 'utf8');

// I removed the 'error' variable from the catch block, but it's used inside
// let's put it back for 'catch (error)' if it's used

code = code.replace(/catch \{([^]*?)if \(error\?\.message/g, 'catch (error: any) {$1if (error?.message');

fs.writeFileSync('src/store/authStore.ts', code);
