// Main application entry point
console.log('🚀 X-Proxy application started');

// Example TypeScript code with type safety
interface AppConfig {
  name: string;
  version: string;
  port: number;
}

const config: AppConfig = {
  name: 'X-Proxy',
  version: '1.0.0',
  port: 3000,
};

// Initialize application
function initApp(): void {
  console.log(`Initializing ${config.name} v${config.version}`);
  console.log(`Server will run on port ${config.port}`);
  
  // Add your application logic here
  setupEventListeners();
  loadConfiguration();
}

// Setup event listeners
function setupEventListeners(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      console.log('DOM fully loaded and parsed');
      updateUI();
    });
  }
}

// Load configuration
async function loadConfiguration(): Promise<void> {
  try {
    // Simulated async configuration loading
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Configuration loaded successfully');
  } catch (error) {
    console.error('Failed to load configuration:', error);
  }
}

// Update UI
function updateUI(): void {
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.innerHTML = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2rem; text-align: center;">
        <h1>🚀 ${config.name}</h1>
        <p>Version ${config.version}</p>
        <p>Modern TypeScript + Vite Development Environment</p>
        <p style="color: #666; margin-top: 2rem;">Edit <code>src/main.ts</code> to get started</p>
      </div>
    `;
  }
}

// Start the application
initApp();

// Export for potential module usage
export { config, initApp };
