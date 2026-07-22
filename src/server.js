require("dotenv").config();
const http=require("http");
const app=require("./app");
const {connectDB, disconnectDB}= require("./config/database")

const port=process.env.PORT || 5000;
const server=http.createServer(app);

async function startServer() {
  await connectDB(); // fails fast if the DB is unreachable, before accepting requests
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer();


// Graceful shutdown — close DB connections cleanly on Ctrl+C / process kill
process.on("SIGINT", async () => {
  await disconnectDB();
  server.close(() => process.exit(0));
});
 
process.on("SIGTERM", async () => {
  await disconnectDB();
  server.close(() => process.exit(0));
});
