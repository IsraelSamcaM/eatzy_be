import express, { Request, Response } from "express";
require('dotenv').config();
import { PrismaClient } from "@prisma/client";
import { swaggerSetup } from "./documentation/swagger";
import dishRouter from "./routes/dish.route"; 
import restaurantRouter from "./routes/restaurant.route"; 
import multimediaRouter from "./routes/multimedia.routes";


const cors = require('cors');
const prisma: PrismaClient = new PrismaClient();

const app = express();
const corsOptions = {
    origin: '*',
    methods: 'GET,PUT,POST,DELETE,PATCH',
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.static('public'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use('/dish', dishRouter );
app.use('/restaurant', restaurantRouter );
app.use('/multimedia', multimediaRouter );
swaggerSetup(app);

app.get('/', (_, res) => res.send('Hola desde Express en Vercel'));

export default app;
export { prisma };