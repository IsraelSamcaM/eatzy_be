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
const port = process.env.PORT || 3000;

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

app.get('/', (req: Request, res: Response) => {
    res.send('Hola Node + Typescript + Express');
});

export default app;
export { prisma };