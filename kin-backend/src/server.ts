import app from './app';
import { log } from './utils/logger';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  log.info(`Kin API running on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    port: PORT,
  });
});

