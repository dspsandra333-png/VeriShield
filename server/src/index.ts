import { app } from "./app.js";
import { env } from "./config.js";

const port = env.PORT;

app.listen(port, () => {
  console.log(`VeriShield server listening on port ${port} (NODE_ENV=${env.NODE_ENV})`);
});

