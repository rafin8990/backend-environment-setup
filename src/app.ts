import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import path from 'path';
import os from 'os';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import routes from './app/routes';

import cookieParser from 'cookie-parser';

const app: Application = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/v1', routes);

// Health check endpoint for dashboard
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Healthy and Running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// System metrics endpoint for dashboard
app.get('/api/v1/system/metrics', (req: Request, res: Response) => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  res.status(httpStatus.OK).json({
    success: true,
    data: {
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: ((usedMemory / totalMemory) * 100).toFixed(2)
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
        platform: os.platform(),
        arch: os.arch()
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      },
      node: {
        version: process.version,
        memory: process.memoryUsage(),
        pid: process.pid
      }
    }
  });
});

// API documentation endpoint
app.get('/api/v1/docs', (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    data: {
      baseUrl: '/api/v1',
      endpoints: [
        {
          method: 'GET',
          path: '/auth/login',
          description: 'User authentication'
        },
        {
          method: 'POST',
          path: '/auth/register',
          description: 'User registration'
        },
        {
          method: 'GET',
          path: '/users',
          description: 'Get all users'
        },
        {
          method: 'GET',
          path: '/categories',
          description: 'Get all categories'
        },
        {
          method: 'GET',
          path: '/items',
          description: 'Get all items'
        },
        {
          method: 'GET',
          path: '/stocks',
          description: 'Get stock information'
        },
        {
          method: 'GET',
          path: '/location-stocks',
          description: 'Get location-based stock information'
        },
        {
          method: 'GET',
          path: '/stock-transfers',
          description: 'Get stock transfer information'
        },
        {
          method: 'GET',
          path: '/stock-movements',
          description: 'Get stock movement history'
        },
        {
          method: 'GET',
          path: '/suppliers',
          description: 'Get supplier information'
        },
        {
          method: 'GET',
          path: '/orders',
          description: 'Get order information'
        },
        {
          method: 'GET',
          path: '/recipes',
          description: 'Get recipe information'
        },
        {
          method: 'GET',
          path: '/requisitions',
          description: 'Get requisition information'
        },
        {
          method: 'GET',
          path: '/locations',
          description: 'Get location information'
        },
        {
          method: 'GET',
          path: '/low-stock-alerts',
          description: 'Get low stock alerts'
        }
      ]
    }
  });
});

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(globalErrorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {

  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'Not Found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'API Not Found',
      },
    ],
  });
  next();
});

export default app;
