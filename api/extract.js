import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// PROMPTS MELHORADOS
const PROMPTS = {
  // RG: Adicionado orgao_emissor e texto_assinatura
  rg: `Analise esta imagem de RG brasileiro. Extraia os dados e retorne APENAS um JSON puro (sem markdown) com as seguintes chaves em snake_case:
  - nome_completo
  - rg_numero (apenas números)
  - orgao_emissor (ex: SSP/SP, DETRAN/RJ)
  - cpf (apenas números, se houver)
  - data_nascimento (formato DD/MM/AAAA)
  - nome_mae
  - texto_assinatura (o que está escrito na assinatura do titular, se legível. Caso contrário, deixe vazio).`,
  
  cnh: `Analise esta CNH. Retorne APENAS um JSON puro com as chaves: nome_completo, registro_numero, cpf, data_validade, categoria_habilitacao.`,
  
  classe: `Analise este documento profissional (OAB, CRM, etc). Retorne APENAS um JSON puro com as chaves: nome_completo, tipo_documento (ex: Carteira da OAB), numero_inscricao, data_validade.`,
  
  endereco: `Analise este comprovante de residência. Retorne APENAS um JSON puro com as chaves: destinatario_nome, logradouro, numero, complemento, bairro, cidade, uf, cep.`
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { imageBase64, type } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Imagem ausente" });

    const cleanBase64 = imageBase64.split(",")[1] || imageBase64;

    // Usando o modelo 2.0 Flash Experimental (o mais poderoso atual)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const result = await model.generateContent([
      PROMPTS[type] || PROMPTS.rg,
      { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } },
    ]);

    const text = result.response.text();
    // Limpeza robusta para garantir JSON
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Tenta fazer o parse. Se o Gemini mandou algo que não é JSON, vai dar erro aqui.
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch (e) {
        console.error("Erro ao fazer parse do JSON do Gemini:", jsonString);
        throw new Error("A IA não retornou um formato válido. Tente novamente.");
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Erro Geral:", error);
    return res.status(500).json({ error: error.message || "Falha interna" });
  }
}