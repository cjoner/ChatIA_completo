const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios'); 

const app = express();

// Middleware CORS
const corsOptions = {
    origin: ['https://chat-ia-chef.netlify.app', 'https://mongodb-usuario-chatia.onrender.com'], 
    methods: ['GET', 'POST'], 
    allowedHeaders: ['Content-Type'], 
};
app.use(cors(corsOptions)); 

// Conectando ao MongoDB
mongoose.connect('mongodb+srv://clarachjoner2007:alex156600@chat-chef-ia.ficqopw.mongodb.net/db_chatChef?retryWrites=true&w=majority&appName=Chat-chef-ia', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB', err));

// Definindo o schema do histórico
const historicoSchema = new mongoose.Schema({
    userId: String,
    messages: [{
        sender: String, // "user" ou "ai"
        text: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

const Historico = mongoose.model('Historico', historicoSchema);

// Endpoint para salvar o histórico
app.post('/api/db_chatChef_historico', async (req, res) => {
    const { userId, userMessage, aiMessage } = req.body;

    try {
        const historico = await Historico.findOne({ userId });
        if (!historico) {
            const novoHistorico = new Historico({
                userId,
                messages: [{ sender: 'user', text: userMessage }, { sender: 'ai', text: aiMessage }]
            });
            await novoHistorico.save();
        } else {
            historico.messages.push({ sender: 'user', text: userMessage });
            historico.messages.push({ sender: 'ai', text: aiMessage });
            await historico.save();
        }

        res.status(201).send('Histórico salvo');
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        res.status(500).send('Erro ao salvar histórico');
    }
});

// Endpoint para obter o histórico de um usuário
app.get('/api/db_chatChef_historico/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const historico = await Historico.findOne({ userId });
        if (!historico) {
            return res.status(404).send('Histórico não encontrado');
        }
        res.json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).send('Erro ao buscar histórico');
    }
});

// Configuração do modelo de Chat
const chatSchema = new mongoose
