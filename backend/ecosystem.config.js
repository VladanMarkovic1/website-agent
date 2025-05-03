export const apps = [{
    name: "website-agent-backend",
    script: "./server.js",
    // Optional: Uncomment and set the number of instances for cluster mode
    instances: "max", // Or a specific number like 2
    exec_mode: "cluster",
    // Optional: Specify NODE_ENV, though typically handled by .env in the app
    env_production: { // Use env_production for production-specific settings
      NODE_ENV: "production",
    }
}]; 