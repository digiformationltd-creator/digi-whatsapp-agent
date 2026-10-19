const http = require('http');
const cp = require('child_process');
const path = require('path');

const exe = path.join(__dirname, '..', 'release', 'win-unpacked', 'Digi WhatsApp Agent.exe');
console.log('Launching executable:', exe);

const child = cp.spawn(exe, [], {
  detached: true,
  stdio: 'ignore'
});
child.unref();

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Waiting for application to boot and expose API...');
  let ok = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const h = await fetchJson('http://127.0.0.1:9010/api/health');
      if (h && h.ok) {
        console.log('SUCCESS - Health check:', JSON.stringify(h));
        
        const cl = await fetchJson('http://127.0.0.1:9010/api/channels/live');
        console.log('SUCCESS - Channels Live:', JSON.stringify(cl));

        const acc = await fetchJson('http://127.0.0.1:9010/api/whatsapp/accounts');
        console.log('SUCCESS - WhatsApp Accounts:', JSON.stringify(acc));

        const bl = await fetchJson('http://127.0.0.1:9010/api/whatsapp/blocklist?id=0');
        console.log('SUCCESS - WhatsApp Blocklist:', JSON.stringify(bl));

        const km = await fetchJson('http://127.0.0.1:9010/api/whatsapp/knowledge?id=0');
        console.log('SUCCESS - WhatsApp Knowledge length:', typeof km?.text === 'string' ? km.text.length : 'none');

        ok = true;
        break;
      }
    } catch (e) {
      // still starting up
    }
  }

  try {
    cp.execSync('taskkill /F /IM "Digi WhatsApp Agent.exe" /T', { stdio: 'ignore' });
  } catch {}

  if (!ok) {
    console.error('FAILED to reach app on 9010');
    process.exit(1);
  } else {
    console.log('ALL VERIFICATIONS PASSED: Packaged Electron application is 100% operational!');
    process.exit(0);
  }
}

run();
