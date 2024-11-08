/**
 * @file dbConnection.js
 * @description Enhanced MongoDB connection with advanced monitoring and failover
 * @author TheWatcher01
 * @date 2024-11-08
 */

import mongoose from "mongoose";
import config from "./dotenvConfig.js";
import backendLogger from "./backendLogger.js";

// MongoDB connection options based on environment config
const mongoOptions = {
  serverSelectionTimeoutMS: parseInt(config.MONGODB_CONNECT_TIMEOUT) || 5000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: parseInt(config.MONGODB_MAX_POOL_SIZE) || 10,
  minPoolSize: parseInt(config.MONGODB_MIN_POOL_SIZE) || 2,
  maxIdleTimeMS: parseInt(config.MONGODB_IDLE_TIMEOUT) || 30000,
  connectTimeoutMS: parseInt(config.MONGODB_CONNECT_TIMEOUT) || 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  autoIndex: config.NODE_ENV === "development",
};

// Connection state management
const connectionState = {
  isConnected: false,
  retryCount: 0,
  MAX_RETRIES: 5,
  retryDelay: 5000,
  metrics: {
    activeConnections: 0,
    operations: {
      reads: 0,
      writes: 0,
      errors: 0,
    },
    lastHeartbeat: null,
  },
};

// Monitors MongoDB connection events
const monitorConnection = (connection) => {
  connection.on("connected", () => {
    connectionState.isConnected = true;
    connectionState.retryCount = 0;
    backendLogger.info("MongoDB connection established", {
      host: connection.host,
      port: connection.port,
      name: connection.name,
    });
  });

  connection.on("disconnected", () => {
    connectionState.isConnected = false;
    backendLogger.warn(
      "MongoDB disconnected, initiating reconnection strategy"
    );
    handleReconnection();
  });

  connection.on("error", (err) => {
    backendLogger.error("MongoDB connection error:", {
      error: err.message,
      code: err.code,
      stack: config.NODE_ENV === "development" ? err.stack : undefined,
    });
    handleConnectionError(err);
  });

  // Enhanced monitoring events
  connection.on("monitoring", (event) => {
    if (event.serverHeartbeatSucceeded) {
      connectionState.metrics.lastHeartbeat = new Date();
    }
    if (event.serverHeartbeatFailed) {
      backendLogger.warn("MongoDB heartbeat failed:", {
        duration: event.duration,
        failure: event.failure,
      });
    }
  });
};

// Handles database reconnection
const handleReconnection = async () => {
  if (connectionState.retryCount < connectionState.MAX_RETRIES) {
    connectionState.retryCount++;
    const delay = connectionState.retryDelay * connectionState.retryCount;

    backendLogger.info(
      `Attempting reconnection ${connectionState.retryCount}/${connectionState.MAX_RETRIES} in ${delay}ms`
    );

    setTimeout(() => {
      connectDB().catch((err) => {
        backendLogger.error("Reconnection attempt failed:", err);
      });
    }, delay);
  } else {
    backendLogger.error(
      "Max reconnection attempts reached. Manual intervention required."
    );
    process.emit("SIGTERM");
  }
};

// Handles connection errors
const handleConnectionError = (error) => {
  connectionState.metrics.operations.errors++;

  if (error.name === "MongoServerSelectionError") {
    backendLogger.error(
      "MongoDB server selection failed. Checking cluster health..."
    );
  }

  if (error.name === "MongoNetworkError") {
    backendLogger.error(
      "Network error occurred. Verifying network connectivity..."
    );
  }
};

// Monitors database metrics
const monitorMetrics = (connection) => {
  const metricsInterval = setInterval(
    () => {
      if (connectionState.isConnected) {
        const metrics = {
          timestamp: new Date().toISOString(),
          activeConnections: connection.db.serverConfig.poolSize,
          collections: Object.keys(connection.collections).length,
          models: Object.keys(connection.models).length,
          readyState: connection.readyState,
          operations: connectionState.metrics.operations,
          lastHeartbeat: connectionState.metrics.lastHeartbeat,
        };

        backendLogger.debug("MongoDB metrics:", metrics);

        // Reset operation counters
        connectionState.metrics.operations = {
          reads: 0,
          writes: 0,
          errors: 0,
        };
      }
    },
    parseInt(config.METRICS_INTERVAL) || 60000
  );

  // Cleanup on app termination
  process.on("SIGTERM", () => clearInterval(metricsInterval));
};

// Checks database health
export const checkHealth = async () => {
  try {
    if (!connectionState.isConnected) {
      return {
        status: "error",
        message: "MongoDB disconnected",
        timestamp: new Date().toISOString(),
      };
    }

    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    const dbStats = await mongoose.connection.db.stats();

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: serverStatus.version,
      connections: serverStatus.connections,
      uptime: serverStatus.uptime,
      operationTime: serverStatus.operationTime,
      metrics: {
        collections: dbStats.collections,
        indexes: dbStats.indexes,
        avgObjSize: dbStats.avgObjSize,
      },
      connectionState: connectionState.metrics,
    };
  } catch (error) {
    backendLogger.error("Health check failed:", error);
    return {
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Initializes MongoDB connection
const connectDB = async () => {
  try {
    const sanitizedUri = config.MONGODB_URI.replace(
      /\/\/[^@]+@/,
      "//[hidden]@"
    );
    backendLogger.info("Initializing MongoDB connection...", {
      uri: sanitizedUri,
    });

    if (config.NODE_ENV === "development") {
      mongoose.set("debug", (collectionName, method, query, doc) => {
        backendLogger.debug("Mongoose query:", {
          collection: collectionName,
          method,
          query: JSON.stringify(query),
          doc: JSON.stringify(doc),
        });
      });
    }

    const conn = await mongoose.connect(config.MONGODB_URI, mongoOptions);

    monitorConnection(conn.connection);
    monitorMetrics(conn.connection);

    // Graceful shutdown handler
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        backendLogger.info("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        backendLogger.error("Error during graceful shutdown:", err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    backendLogger.error("MongoDB connection failed:", {
      error: error.message,
      code: error.code,
      stack: config.NODE_ENV === "development" ? error.stack : undefined,
    });

    handleConnectionError(error);
    handleReconnection();
    throw error;
  }
};

export default connectDB;

export const dbUtils = {
  checkHealth,
  isConnected: () => connectionState.isConnected,
  getConnection: () => mongoose.connection,
  getMetrics: () => ({ ...connectionState.metrics }),
};
