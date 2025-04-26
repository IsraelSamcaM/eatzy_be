import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import express from "express";


export const swaggerSetup = (app: express.Application) => {
    const dishDocs = YAML.load(path.join(__dirname, "dish.documentation.yaml"));

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(dishDocs));
};