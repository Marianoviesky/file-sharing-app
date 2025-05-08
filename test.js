// test-appwrite.js
const { Client, Storage } = require('appwrite');
const fs = require('fs');

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('YOUR_PROJECT_ID');
//   .setKey('YOUR_API_KEY');

const storage = new Storage(client);

async function testUpload() {
  try {
    const testFile = fs.readFileSync('./test.txt');
    const fileId = 'test_'+Date.now();

    const result = await storage.createFile(
      'default',
      fileId,
      {
        fileId: fileId,
        filePath: './test.txt',
        filename: 'test.txt',
        mimeType: 'text/plain',
        size: testFile.length,
        stream: () => fs.createReadStream('./test.txt')
      }
    );

    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testUpload();