// Global type declarations for CSS and other assets
import { MongoClient } from 'mongodb';

// Global variables for MongoDB and WebSocket
declare global {
  namespace globalThis {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
    var broadcastAppointmentUpdate: ((doctorId: string, data: any) => void) | undefined;
    var broadcastQueueUpdate: ((doctorId: string, data: any) => void) | undefined;
  }
}

// Node.js process environment
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    MONGODB_URI?: string;
    MONGODB_DB?: string;
    [key: string]: string | undefined;
  }
}

// CSS imports
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// SCSS imports  
declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

// SASS imports
declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

// Image imports
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

export { };
