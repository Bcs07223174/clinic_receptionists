const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const net = require('net');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ 
  dev,
  conf: {
    compress: true,
    generateEtags: true,
    poweredByHeader: false,
  }
});
const handle = app.getRequestHandler();

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, log and continue
  if (dev) {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit in production, log and continue
  if (dev) {
    process.exit(1);
  }
});

// Performance: Cache parsed URLs
const urlCache = new Map();
const MAX_CACHE_SIZE = 1000;

function getCachedUrl(url) {
  if (urlCache.has(url)) {
    return urlCache.get(url);
  }
  
  const parsed = parse(url, true);
  
  // Limit cache size to prevent memory leaks
  if (urlCache.size >= MAX_CACHE_SIZE) {
    const firstKey = urlCache.keys().next().value;
    urlCache.delete(firstKey);
  }
  
  urlCache.set(url, parsed);
  return parsed;
}

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Function to find an available port
async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port <= startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    try {
      // Performance: Use cached URL parsing
      const parsedUrl = getCachedUrl(req.url);
      
      // Performance: Set caching headers for static assets
      if (req.url.startsWith('/_next/static/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      
      // Ensure JSON content-type for API routes
      if (req.url.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
      }
      
      handle(req, res, parsedUrl);
    } catch (error) {
      console.error('❌ Request handling error:', error);
      
      // Send JSON error response for API routes
      if (req.url.startsWith('/api/')) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Internal server error',
          code: 'REQUEST_HANDLER_ERROR',
          timestamp: new Date().toISOString()
        }));
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 - Internal Server Error</h1>');
      }
    }
  });

  // Initialize Socket.IO with performance optimizations
  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    // Performance optimizations
    pingTimeout: 60000,
    pingInterval: 25000,
    compression: true,
    httpCompression: true,
    // Reduce memory usage
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('� Client connected:', socket.id);
    
    socket.on('join-doctor', (doctorId) => {
      socket.join(`doctor-${doctorId}`);
      console.log(`👨‍⚕️ Client ${socket.id} joined doctor room: ${doctorId}`);
    });

    socket.on('leave-doctor', (doctorId) => {
      socket.leave(`doctor-${doctorId}`);
      console.log(`👋 Client ${socket.id} left doctor room: ${doctorId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  // Export broadcast functions globally
  global.broadcastAppointmentUpdate = (doctorId, data) => {
    io.to(`doctor-${doctorId}`).emit('appointment-update', data);
    console.log(`📡 Broadcasted appointment update for doctor: ${doctorId}`);
  };

  global.broadcastQueueUpdate = (doctorId, data) => {
    io.to(`doctor-${doctorId}`).emit('queue-update', data);
    console.log(`📡 Broadcasted queue update for doctor: ${doctorId}`);
  };

  // Find an available port
  const preferredPort = process.env.PORT || 3000;
  let port;
  
  try {
    if (await isPortAvailable(preferredPort)) {
      port = preferredPort;
    } else {
      port = await findAvailablePort(3000);
      console.log(`⚠️ Port ${preferredPort} is busy, using port ${port} instead`);
    }
  } catch (error) {
    console.error('❌ Could not find an available port:', error);
    process.exit(1);
  }
  
  server.listen(port, (err) => {
    if (err) {
      console.error('❌ Server failed to start:', err);
      process.exit(1);
    }
    console.log(`🚀 Server ready on http://localhost:${port}`);
    console.log('✅ WebSocket server initialized');
    
    // Update environment variable for Next.js
    if (port !== 3000) {
      console.log(`� Server running on port ${port} - you can access it at http://localhost:${port}`);
    }
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
