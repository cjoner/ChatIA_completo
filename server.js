require('dotenv').config(); // Carregar as variáveis de ambiente

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Permitir apenas o domínio específico
app.use(cors({
    origin: 'https://chatia-completo.onrender.com',  // Permite apenas esse domínio
    methods: ['GET', 'POST'],  // Métodos permitidos
    allowedHeaders: ['Content-Type']  // Cabeçalhos permitidos
}));

// Middleware para arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB', err));

// Definindo o schema do histórico
const historicoSchema = new mongoose.Schema({
    userId: String,
    messages: [{
        sender: String,  // "user" ou "ai"
        text: String,
        timestamp: { type: Date, default: Date.now },
    }],
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
                messages: [{ sender: 'user', text: userMessage }, { sender: 'ai', text: aiMessage }],
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
        console.log(`Buscando histórico para o usuário: ${userId}`);
        const historico = await Historico.findOne({ userId });
        if (!historico) {
            console.log(`Histórico não encontrado para o usuário: ${userId}`);
            return res.status(404).send('Histórico não encontrado');
        }
        res.json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).send('Erro ao buscar histórico');
    }
});

// Configuração da porta
const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
