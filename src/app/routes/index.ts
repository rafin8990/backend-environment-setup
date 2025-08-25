import express from 'express';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/',
    routes: () => {
      router.post('/', (req, res) => {
        res.send('Hello World');
      });
    },
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.routes));
export default router;
