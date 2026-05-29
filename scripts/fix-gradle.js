const fs = require('fs');
const path = require('path');

const wrapperPath = path.join(process.cwd(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');

try {
  // Read file directly. If it does not exist, it will throw an error to the catch block
  let content = fs.readFileSync(wrapperPath, 'utf8');
  console.log('Patching Gradle wrapper to 8.13...');
  content = content.replace(/gradle-.*-bin\.zip/g, 'gradle-8.13-bin.zip');
  fs.writeFileSync(wrapperPath, content);
  console.log('Successfully patched gradle-wrapper.properties');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('gradle-wrapper.properties not found, skipping patch.');
  } else {
    console.error('An unexpected error occurred:', error.message);
  }
}
