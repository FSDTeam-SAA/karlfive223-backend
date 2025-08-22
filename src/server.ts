import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";

const port = config.port || 5000;

const server = async () => {
  try {
    const connectmongodb = await mongoose.connect(
      config.database_url as string
    );
    console.log(`Database is connected ${connectmongodb.connection.host}`);
    app.listen(port, () => {
      console.log(`server is running on port http://localhost:${port}`);
    });
  } catch (error:any) {
    console.log(error.messqage);
    process.exit(1);
  }
};

server();
