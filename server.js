
const express = require('express');
const cors = require('cors'); // Importar o pacote cors

const app = express();

// Configurar o middleware CORS
const corsOptions = {
    origin: ['https://chat-ia-chef.netlify.app','https://chatia-completo.onrender.com/'], // Permitir apenas este domínio
    methods: ['GET', 'POST'], // Métodos permitidos
    allowedHeaders: ['Content-Type'], // Cabeçalhos permitidos
};

app.use(cors(corsOptions)); // Usar o middleware CORS com as opções


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
const historicoSchema = new mongoose.Schema({
    userId: String,
    message: String,
    localizacao: {
        cidade: String,
        estado: String,
        pais: String
    },
    timestamp: { type: Date, default: Date.now }
});

const Historico = mongoose.model('Historico', historicoSchema);

// Definindo o schema para logs de IP e data
const logSchema = new mongoose.Schema({
    userId: String,
    ip: String,
    timestamp: { type: Date, default: Date.now }
});

const Log = mongoose.model('Log', logSchema);

// Endpoint para registrar o histórico e o IP público, agora com cidade, estado e país
app.post('/api/db_chatChef_historico', async (req, res) => {
    const { message, cidade, estado, pais } = req.body; // Receber mais informações do cliente

    try {
        // Obter o IP público usando a API do Ipfy
        const response = await axios.get('https://api.ipify.org?format=json'); // Requisição para obter o IP
        const userIp = response.data.ip; // Extrair o IP da resposta

        // Verificar se o IP foi corretamente capturado
        console.log('IP público capturado:', userIp);

        // Criar um novo documento de histórico com todas as informações
        const novoHistorico = new Historico({
            userId: userIp,
            message,
            localizacao: { cidade, estado, pais } // Adicionando cidade, estado e país ao registro
        });

        // Salvar no banco de dados MongoDB
        await novoHistorico.save();

        res.status(201).send('Histórico com geolocalização salvo com sucesso');
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        res.status(500).send('Erro ao salvar histórico');
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
        console.log('Received message from user:', userMessage);

        // Iniciar uma nova sessão de chat
        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });

        const result = await chatSession.sendMessage(userMessage);
        const aiResponse = result.response.text();
        console.log('AI response:', aiResponse);

        // Salvar o histórico de chat no banco de dados
        const chat = new Chat({ userMessage, aiResponse });
        await chat.save();

        res.json({ response: aiResponse });
    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).send('Internal Server Error');
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