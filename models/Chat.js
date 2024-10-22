const mongoose = require('mongoose');

// Definindo o esquema (schema) para a coleção de conversas
const chatSchema = new mongoose.Schema({
  userMessage: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Criando o modelo com base no esquema definido
const Chat = mongoose.model('Chat', chatSchema);

// Exportando o modelo para que possa ser utilizado em outras partes do projeto
module.exports = Chat;
