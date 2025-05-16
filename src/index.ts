import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import dishRouter from './routes/dish.route';
import multimediaRouter from "./routes/multimedia.routes";
import restaurantRouter from './routes/restaurant.route';
import tableRouter from './routes/table.route';
import { swaggerSetup } from "./documentation/swagger";
import cors from 'cors';
import orderRouter from './routes/order.route';

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

// Configuración de Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compartir io con las rutas
app.set('io', io);

// Rutas
app.use('/dish', dishRouter);
app.use('/restaurant', restaurantRouter );
app.use('/multimedia', multimediaRouter );
app.use('/table', tableRouter);
app.use('/order', orderRouter)
swaggerSetup(app);


// Manejo básico de conexiones Socket.IO
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Exportar para Vercel y desarrollo local
export { httpServer as server, app, prisma };
export default app;