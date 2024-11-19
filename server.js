const express = require('express');
const mongoose = require('mongoose');
const app = express();

const Historico = require('./models/Historico'); // Seu modelo de Histórico de chat

app.use(express.json());

// Conectando ao MongoDB
mongoose.connect('mongodb+srv://usuario:senha@cluster.mongodb.net/db_chatChef', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB', err));

// Definindo o schema de Histórico de Chat
const historicoSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId, // Usando o tipo ObjectId do MongoDB
  messages: [{
    sender: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const Historico = mongoose.model('Historico', historicoSchema);

// Endpoint para registrar histórico
app.post('/api/db_chatChef_historico', async (req, res) => {
  const { userMessage, aiMessage } = req.body;

  try {
    // Buscando o histórico do usuário baseado em um critério, por exemplo, email ou nome
    let user = await Historico.findOne({ 'messages.sender': 'user' });

    if (!user) {
      // Se não encontrar, significa que o usuário não tem histórico. Retorne um erro ou crie um novo usuário.
      return res.status(404).send('Usuário não encontrado');
    }

    // Agora você tem o userId, vamos pegar o ID do usuário do histórico encontrado
    const userId = user.userId;

    // Atualizar o histórico do usuário com a nova mensagem
    user.messages.push({ sender: 'user', text: userMessage });
    user.messages.push({ sender: 'ai', text: aiMessage });

    await user.save();
    res.status(200).send('Histórico atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
    res.status(500).send('Erro ao salvar histórico');
  }
});

// Rota para obter o histórico de um usuário
app.get('/api/db_chatChef_historico/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const historico = await Historico.findOne({ userId: mongoose.Types.ObjectId(userId) });

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