// API endpoint for Vercel Cron: triggers daily news sync
// Accessible at: /api/cron/sync-news

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = process.env.CRON_SECRET;
  if (req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[cron] Starting daily news sync...');

    // Dynamically import the sync script
    const { default: syncScript } = await import('../../scripts/sync-news-to-neon.js');

    // Run the sync (it's already a standalone main() function)
    // We'll invoke it by simulating command line args
    const originalArgv = process.argv;
    process.argv = ['node', 'sync-news-to-neon.js', '--tickers', process.env.NEWS_SYNC_TICKERS || 'MSB.AX'];

    // Set a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sync timeout after 60s')), 60000)
    );

    // Since the script calls main() which doesn't export, we need a different approach
    // Actually, let's just spawn the script as a child process
    const { spawn } = require('child_process');

    const syncProcess = spawn('node', ['scripts/sync-news-to-neon.js', '--tickers', process.env.NEWS_SYNC_TICKERS || 'MSB.AX'], {
      cwd: '/var/task', // Vercel function root
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    let output = '';
    let errorOutput = '';

    syncProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[cron stdout] ${data}`);
    });

    syncProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[cron stderr] ${data}`);
    });

    const exitCode = await new Promise((resolve) => {
      syncProcess.on('close', (code) => {
        resolve(code);
      });
    });

    if (exitCode !== 0) {
      console.error(`[cron] Sync failed with exit code ${exitCode}`);
      return res.status(500).json({
        error: 'Sync failed',
        exitCode,
        output,
        errorOutput,
      });
    }

    console.log('[cron] Sync completed successfully');
    return res.status(200).json({
      success: true,
      message: 'News sync completed',
      output,
    });
  } catch (error) {
    console.error('[cron] Error:', error.message);
    return res.status(500).json({
      error: 'Sync error',
      message: error.message,
    });
  }
}
