const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const TELEGRAM_BOT_TOKEN = '8595340052:AAG-BJlDwY00jt4rK30Z4Oe6rnQEjBqY6mk';
const TELEGRAM_CHAT_ID = '5301822155';

async function test() {
  const form = new FormData();
  form.append('chat_id', TELEGRAM_CHAT_ID);
  
  // Create a dummy file
  const dummyPath = path.join(__dirname, 'dummy.txt');
  fs.writeFileSync(dummyPath, 'Hello from test');
  
  form.append('document', fs.createReadStream(dummyPath), 'dummy.txt');
  form.append('caption', 'Test Message');
  
  try {
    await axios.post('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendDocument', form, {
      headers: form.getHeaders(),
    });
    console.log('Success');
  } catch (e) {
    console.error('Failed', e.message);
    if(e.response) console.error(e.response.data);
  }
}
test();
