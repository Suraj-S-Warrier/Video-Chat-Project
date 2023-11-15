const express = require("express");
const app = express();
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

connectDB();

app.use(express.json());
app.get("/", (req, res) => {
  res.send("API is running successfully");
});

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(
  PORT,
  console.log(`Server started on port ${PORT}`.yellow.bold)
);
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  //console.log("connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    //console.log(userData._id);
    socket.emit("connected");
  });
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ` + room);
  });

  socket.on("typing", (room) => {
    console.log(`User ${socket.id} is typing in room ${room}`);
    socket.to(room).emit("typing_s",room);
  });
 socket.on("stop typing", (room) => {
   console.log(`User ${socket.id} stopped typing in room ${room}`);
   socket.to(room).emit("stop typing_s",room);
 });

  socket.on("new message", (newMessageReceived) => {
    var chat = newMessageReceived.chat;
    if (!chat.users) return console.log("chat.users not defined");
    chat.users.forEach((user) => {
      if (user._id == newMessageReceived.sender._id) return;
      socket.in(user._id).emit("message received", newMessageReceived);
    });
  });

  socket.off("setup",() =>{
    socket.leave(userData._id);
  })
});
