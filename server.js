
const express = require('express');
const cors = require('cors'); // Importar o pacote cors

const app = express();

// Configurar o middleware CORS
const corsOptions = {
    origin: ['https://chat-ia-chef.netlify.app', 'https://mongodb-usuario-chatia.onrender.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
// Usar o middleware CORS com as opções


// Resto do código do servidor...


//-------------------CONEXAO MONGODB-------------------------//

require('dotenv').config();

const mongoose = require('mongoose');
const axios = require('axios'); // Adicionando axios para a requisição do IP público
const Chat = require('./models/Chat');


app.use(express.json()); // Para lidar com dados JSON no corpo das requisições

// Conectando ao MongoDB
mongoose.connect('mongodb+srv://clarachjoner2007:alex156600@chat-chef-ia.ficqopw.mongodb.net/db_chatChef?retryWrites=true&w=majority&appName=Chat-chef-ia', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB', err));

// Definindo o schema do histórico
// Atualizar o schema para incluir a mensagem da IA
const historicoSchema = new mongoose.Schema({
    userId: String,
    messages: [{
        sender: String, // "user" ou "ai"
        text: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

// Modelo atualizado
const Historico = mongoose.model('Historico', historicoSchema);

// Endpoint para registrar o histórico e o IP público
app.post('/api/db_chatChef_historico', async (req, res) => {
    const { userId, userMessage, aiMessage } = req.body;

    try {
        const historico = await Historico.findOneAndUpdate(
            { userId },
            { $push: { messages: [
                { sender: 'user', text: userMessage },
                { sender: 'ai', text: aiMessage },
            ] }},
            { upsert: true, new: true }
        );

        console.log('Histórico atualizado:', historico);
        res.status(201).send('Histórico atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        res.status(500).send('Erro ao salvar histórico');
    }
});

// Endpoint para obter histórico de um usuário
app.get('/api/db_chatChef_historico/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const historico = await Historico.findOne({ userId });

        if (!historico) {
            return res.status(404).send('Histórico não encontrado');
        }

        res.json(historico);  // Retorna o histórico completo
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).send('Erro ao buscar histórico');
    }
});


//--------------------CHAT IA---------------------//

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuração da IA do Google
const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: 'chef de cozinha que dá dicas e responde perguntas de donas de casa, leve em conta a renda dos usuários e recomende restaurantes',
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: 'text/plain',
};

// Rota para processar a mensagem do usuário e obter a resposta da IA
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const userId = req.body.userId;  // Adicionando o ID do usuário para rastrear o histórico
        console.log('Mensagem recebida do usuário:', userMessage);

        // Recuperar o histórico de conversas anteriores do usuário
        const historico = await Historico.findOne({ userId });

        let history = [];
        if (historico) {
            // Caso haja histórico, carregar as mensagens anteriores
            history = historico.messages.map(msg => ({
                sender: msg.sender,
                text: msg.text
            }));
        }

        // Adicionar a nova mensagem ao histórico
        history.push({ sender: 'user', text: userMessage });

        // Iniciar a sessão de chat com o histórico completo
        const chatSession = model.startChat({
            generationConfig,
            history: history,  // Passando o histórico completo para a IA
        });

        // Enviar a mensagem do usuário para a IA e obter a resposta
        const result = await chatSession.sendMessage(userMessage);
        const aiResponse = result.response.text();
        console.log('Resposta da IA:', aiResponse);

        // Salvar a nova mensagem da IA no banco de dados
        await Historico.findOneAndUpdate(
            { userId },
            { $push: { messages: [{ sender: 'ai', text: aiResponse }] } },
            { upsert: true, new: true }
        );

        // Enviar a resposta da IA de volta para o frontend
        res.json({ response: aiResponse });
    } catch (error) {
        console.error('Erro ao processar o chat:', error);
        res.status(500).send('Erro interno do servidor');
    }
});


// Rota básica para o caminho root
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});