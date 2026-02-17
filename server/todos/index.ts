import { HonoVariable } from "../middleware";
import events from "./events";
import categories from "./categories";
import search from "./search";
import { OpenAPIHono } from "@hono/zod-openapi";

export const todoApp = new OpenAPIHono<HonoVariable>()
  .route('/', events)
  .route('/', categories)
  .route('/', search);