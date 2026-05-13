import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );

    channel = await connection.createChannel();

    await channel.assertQueue("push_notifications", {
      durable: true,
    });

    console.log("RabbitMQ Connected");
  } catch (error) {
    console.error("RabbitMQ Connection Error:", error);
  }
};

export const getChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }

  return channel;
};