import express, { Request, Response } from 'express';
import db from './db';
const app = express();

app.get('/api/ping', async (req: Request, res: Response) => {
  try {
    await db.ping();
    res.status(200).json({ message: 'Server and database are running' });
  } catch (error) {
    console.error(error);
    res.status(503).json({ message: 'Database connection failed' });
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});