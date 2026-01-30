import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- PROMPTS (Apenas Texto agora, sem coordenadas) ---
const PROMPTS = {
  rg: `Analise esta imagem de RG. Extraia os dados e retorne APENAS um JSON puro (sem markdown) com as chaves em snake_case:
  - nome_completo
  - nome_social (se houver, senão null)
  - rg_numero (apenas números)
  - orgao_emissor (ex: SSP/SP)
  - cpf (apenas números, se houver)
  - data_nascimento (DD/MM/AAAA)
  - data_validade (DD/MM/AAAA, se houver)
  - nome_mae
  - nome_pai (se houver, senão null)
  - naturalidade (cidade/UF)`,

  cnh: `Analise esta CNH. Extraia os dados e retorne APENAS um JSON puro (sem markdown) com as chaves em snake_case:
  - nome_completo
  - cpf (apenas números)
  - rg_numero
  - orgao_emissor_rg
  - registro_numero (em vermelho)
  - categoria_habilitacao
  - data_validade (DD/MM/AAAA)
  - data_primeira_habilitacao (DD/MM/AAAA)
  - data_nascimento (DD/MM/AAAA)
  - nome_mae
  - nome_pai (se houver)
  - observacoes`,

  classe: `Analise este documento de classe (OAB, CRM, etc). Extraia os dados e retorne APENAS um JSON puro (sem markdown) com as chaves em snake_case:
  - nome_completo
  - tipo_documento (ex: OAB, CRM)
  - numero_inscricao
  - seccional_ou_regiao
  - cpf
  - rg_numero
  - data_validade (DD/MM/AAAA)
  - data_emissao
  - filiacao`,

  endereco: `Analise comprovante de residência. Retorne APENAS um JSON puro com: destinatario_nome, logradouro, numero, complemento, bairro, cidade, uf, cep, data_emissao.`
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
    
    // Limpeza do base64
    const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    
    // Inicializa Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const selectedPrompt = PROMPTS[type] || PROMPTS.rg;
Q
    // Chama a IA
    const result = await model.generateContent([
      selectedPrompt,
      { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } },
    ]);

    const text = result.response.text();
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      console.error("Erro Parse JSON:", jsonString);
      throw new Error("Falha ao interpretar resposta da IA");
    }

    // Retorna os dados + a imagem original para exibição
    data.imagem_original = imageBase64.startsWith("data:") 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    return res.status(200).json(data);

  } catch (error) {
    console.error("Erro API:", error);
    return res.status(500).json({ error: error.message || "Falha interna" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};