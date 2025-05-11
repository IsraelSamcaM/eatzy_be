import { server } from './src/index';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`WebSocket corriendo en ws://localhost:${PORT}`);
});