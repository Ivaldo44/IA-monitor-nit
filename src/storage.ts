/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./lib/supabase";
import {
  IARecord,
  StatusAuditoria,
  StatusUso,
  Criticidade,
  ClassificacaoRisco,
  TiposIA,
  ObjetivosIA,
  EtapaProcesso,
  NaturezaUso,
  GrauAutonomia,
  RiscoResidual,
  UserProfile
} from "./types";

const STORAGE_KEY = "cedro_ia_inventory";

export const getProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
};

export const getRecords = async (userId?: string, isAdmin?: boolean, userSector?: string): Promise<IARecord[]> => {
  try {
    console.log('🔍 Buscando registros no Supabase...', { userId, isAdmin, userSector });
    let query = supabase
      .from('ia_records')
      .select('*');

    if (!isAdmin && userId) {
      console.log('🛡️ Aplicando filtros de segurança para usuário comum');
      // Filtrando apenas por setor se o usuário não for admin
      if (userSector) {
        const escapedSector = `"${userSector}"`;
        query = query.eq('unidade_setor', userSector);
      }
    }

    const { data, error, status } = await query.order('id', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar no Supabase:', error, 'Status:', status);
      throw error;
    }

    if (data && data.length > 0) {
      console.log(`✅ ${data.length} registros encontrados no Supabase.`);
      const mappedData = data.map(item => {
        let record: IARecord;
        
        if (item.data) {
          record = item.data as IARecord;
          record.id = item.id; // Sync ID
        } else {
          record = {
            id: item.id,
            unidadeSetor: item.unidade_setor || '',
            responsavelPreenchimento: item.responsavel_preenchimento || '',
            cargo: item.cargo || '',
            dataRegistro: item.data_registro || new Date().toISOString().split('T')[0],
            utilizaIA: item.utiliza_ia || 'Sim',
            nomeFerramenta: item.nome_ferramenta || 'IA sem nome',
            fornecedor: item.fornecedor || 'Desconhecido',
            statusUso: (item.status_uso as StatusUso) || StatusUso.EM_AVALIACAO,
            createdAt: item.created_at || new Date().toISOString(),
            updatedAt: item.updated_at || new Date().toISOString(),
            historico: []
          } as any as IARecord;
        }

        // Ensure statusAuditoria is never undefined for filtering purposes
        if (!record.statusAuditoria) {
          record.statusAuditoria = StatusAuditoria.PENDENTE;
        }

        return record;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedData));
      return mappedData;
    }

    console.log('ℹ️ Supabase retornou 0 registros. Verificando fallback...');

    const localDataStr = localStorage.getItem(STORAGE_KEY);
    if (localDataStr) {
      const localRecords: IARecord[] = JSON.parse(localDataStr);
      if (localRecords.length > 0) {
        console.log('📦 Carregando do LocalStorage:', localRecords.length);
        
        // Aplicar filtro de setor no fallback local também
        if (!isAdmin && userId && userSector) {
          return localRecords.filter(r => r.unidadeSetor === userSector);
        }
        
        return localRecords;
      }
    }

    console.log('💡 Carregando registros padrão/exemplo.');
    const examples = getExampleRecords();
    
    // Aplicar filtro de setor nos exemplos também
    if (!isAdmin && userId && userSector) {
      return examples.filter(r => r.unidadeSetor === userSector);
    }
    
    return examples;
  } catch (error) {
    console.error('💥 Erro crítico no getRecords:', error);
    const data = localStorage.getItem(STORAGE_KEY);
    try {
      if (data) return JSON.parse(data);
    } catch (e) {}
    return getExampleRecords();
  }
};

export const addRecord = async (record: IARecord, userId?: string, isAdmin?: boolean) => {
  try {
    console.log('☁️ Tentando salvar registro no Supabase:', record.id);
    
    // Determinando o status final: 
    // Pendente, Aprovado ou Negado
    const finalStatus = record.statusAuditoria || (isAdmin ? StatusAuditoria.APROVADO : StatusAuditoria.PENDENTE);
    const recordWithStatus = { ...record, statusAuditoria: finalStatus };

    const { error } = await supabase
      .from('ia_records')
      .upsert({ 
        id: record.id, 
        data: recordWithStatus,
        updated_at: new Date().toISOString(),
        unidade_setor: record.unidadeSetor,
        responsavel_preenchimento: record.responsavelPreenchimento,
        nome_ferramenta: record.nomeFerramenta
      });
    
    if (error) {
      console.error('❌ Erro detalhado do Supabase:', error);
      throw error;
    }
    console.log('✅ Registro salvo com sucesso no Supabase!');
  } catch (error: any) {
    console.error('Error adding to Supabase:', error);
    throw error; 
  }
  
  // Local fallback
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    const records: IARecord[] = localData ? JSON.parse(localData) : [];
    const index = records.findIndex(r => r.id === record.id);
    const finalStatus = record.statusAuditoria || (isAdmin ? StatusAuditoria.APROVADO : StatusAuditoria.PENDENTE);
    const recordWithStatus = { ...record, statusAuditoria: finalStatus };
    
    if (index === -1) records.push(recordWithStatus);
    else records[index] = recordWithStatus;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Local sync failed:', e);
  }
};

export const saveRecordsToSupabase = async (records: IARecord[], userId?: string, isAdmin?: boolean) => {
  console.log(`Syncing ${records.length} records to Supabase...`);
  for (const record of records) {
    await addRecord(record, userId, isAdmin);
  }
};

export const updateRecord = async (record: IARecord, userId?: string, isAdmin?: boolean) => {
  return addRecord(record, userId, isAdmin); // Upsert handles update
};

export const addOrUpdateRecord = async (record: IARecord, userId?: string, isAdmin?: boolean) => {
  return addRecord(record, userId, isAdmin);
};

export const deleteRecord = async (id: string) => {
  try {
    const { error } = await supabase
      .from('ia_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    // If Supabase failed, we still try local delete but we should probably inform the UI
    // if it was specifically a network/auth error. 
    // However, we'll throw here to let App.tsx know if it should rollback the optimistic update
    throw error;
  }

  // Local sync
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      const records = JSON.parse(localData);
      const filtered = records.filter((r: any) => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Error updating localStorage:', e);
  }
};

export const checkSupabaseStatus = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('ia_records').select('id').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
};

export const generateId = (records: IARecord[]): string => {
  if (records.length === 0) return "IA-CEDRO-0001";
  
  // Extrair números dos IDs existentes e pegar o maior
  const ids = records.map(r => {
    const match = r.id.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  });
  
  const maxId = Math.max(...ids);
  return `IA-CEDRO-${(maxId + 1).toString().padStart(4, "0")}`;
};

function getExampleRecords(): IARecord[] {
  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  return [
    {
      id: "IA-CEDRO-0001",
      createdAt: now,
      updatedAt: now,
      unidadeSetor: "Atendimento / Recepção",
      responsavelPreenchimento: "João Silva",
      cargo: "Gestor Administrativo",
      dataRegistro: dateStr,
      utilizaIA: "Sim",
      nomeFerramenta: "CedroBot Chat",
      fornecedor: "Zendesk AI",
      versao: "1.2 Enterprise",
      tipoIA: [TiposIA.CHATBOT],
      descricaoAtividade: "Chatbot para triagem de pacientes e agendamento de exames via site e WhatsApp.",
      objetivos: [ObjetivosIA.GESTAO_ADMINISTRATIVA, ObjetivosIA.PRODUTIVIDADE],
      etapaProcesso: EtapaProcesso.ATENDIMENTO,
      beneficiosEsperados: "Redução no tempo de espera e automatização de agendamentos simples.",
      usaDadosPessoais: "Sim",
      usaDadosSensiveis: "Não",
      quaisDados: "Nome, CPF, Telefone, Tipo de Exame",
      dadosAnonimizados: "Não",
      envioFornecedorExterno: "Sim",
      dadosTreinamentoModelo: "Não",
      obsProtecaoDados: "Dados criptografados em trânsito.",
      integradaSistemaInterno: "Sim",
      qualSistema: "CRM / Sistema de Atendimento",
      impactoResultadosLaboratoriais: "Não",
      validacaoHumana: "Sim",
      quemValida: "Equipe de triagem no check-in",
      registroLogDecisao: "Sim",
      ambienteHomologacao: "Sim",
      obsIntegracao: "API Rest estável.",
      riscosIdentificados: "Sim",
      quaisRiscos: "Erro na interpretação do pedido de exame.",
      controlesImplementados: "Sim",
      quaisControles: ["Revisão humana obrigatória", "Treinamento dos usuários"],
      riscoResidual: RiscoResidual.BAIXO,
      responsavelRisco: "João Silva",
      frequenciaReavaliacao: "Anual",
      obsRiscosControles: "Risco baixo devido à validação humana no balcão.",
      alinhadoLGPD: "Sim",
      politicaInterna: "Sim",
      treinamentoColaboradores: "Sim",
      documentacaoTecnica: "Sim",
      contratoProtecaoDados: "Sim",
      controleAcessoPerfil: "Sim",
      trilhaAuditoria: "Sim",
      procedimentoIncidente: "Sim",
      obsConformidade: "Tudo em conformidade.",
      criticidade: Criticidade.BAIXA,
      naturezaUso: NaturezaUso.ADMINISTRATIVO,
      grauAutonomia: GrauAutonomia.MEDIO,
      classificacaoRiscoAutomatico: ClassificacaoRisco.BAIXO,
      classificacaoRiscoManual: ClassificacaoRisco.BAIXO,
      areaAvaliadora: ["NIT", "TI"],
      statusUso: StatusUso.APROVADO,
      necessitaPlanoAcao: "Não",
      parecerTecnico: "Solução segura com baixo impacto técnico.",
      observacoesGerais: "Iniciado em Janeiro de 2024.",
      anexos: "Link para documentação técnica interna.",
      statusAuditoria: StatusAuditoria.APROVADO,
      historico: [{ date: now, action: "Criação do registro" }]
    },
    {
      id: "IA-CEDRO-0002",
      createdAt: now,
      updatedAt: now,
      unidadeSetor: "Laboratório de Patologia",
      responsavelPreenchimento: "Dra. Maria Oliveira",
      cargo: "Médica Patologista / Coordenadora",
      dataRegistro: dateStr,
      utilizaIA: "Sim",
      nomeFerramenta: "PathoScan AI",
      fornecedor: "DeepTech Health",
      versao: "2023.4",
      tipoIA: [TiposIA.ANALISE_IMAGENS, TiposIA.MACHINE_LEARNING],
      descricaoAtividade: "Identificação automática de células suspeitas em lâminas digitais de citopatologia.",
      objetivos: [ObjetivosIA.ANALISE_IMAGENS, ObjetivosIA.TRIAGEM_PRIORIZACAO],
      etapaProcesso: EtapaProcesso.ANALITICA,
      beneficiosEsperados: "Aumento na precisão diagnóstica e agilidade na triagem de casos críticos.",
      usaDadosPessoais: "Sim",
      usaDadosSensiveis: "Sim",
      quaisDados: "Imagens de lâminas, ID do paciente, histórico clínico resumido",
      dadosAnonimizados: "Parcial",
      envioFornecedorExterno: "Sim",
      dadosTreinamentoModelo: "Sim",
      obsProtecaoDados: "Envio de dados via servidor seguro (VPN).",
      integradaSistemaInterno: "Sim",
      qualSistema: "Middleware / Sistema de Laudos",
      impactoResultadosLaboratoriais: "Sim",
      validacaoHumana: "Sim",
      quemValida: "Médico Patologista",
      registroLogDecisao: "Sim",
      ambienteHomologacao: "Sim",
      obsIntegracao: "Integrado ao visualizador de lâminas.",
      riscosIdentificados: "Sim",
      quaisRiscos: "Falso negativo ou classificação incorreta.",
      controlesImplementados: "Sim",
      quaisControles: ["Revisão humana obrigatória", "Monitoramento de uso", "Validação técnica prévia"],
      riscoResidual: RiscoResidual.MEDIO,
      responsavelRisco: "Maria Oliveira",
      frequenciaReavaliacao: "Semestral",
      obsRiscosControles: "Uso obrigatório de revisão por médico especialista.",
      alinhadoLGPD: "Sim",
      politicaInterna: "Sim",
      treinamentoColaboradores: "Sim",
      documentacaoTecnica: "Sim",
      contratoProtecaoDados: "Sim",
      controleAcessoPerfil: "Sim",
      trilhaAuditoria: "Sim",
      procedimentoIncidente: "Sim",
      obsConformidade: "Avaliado pelo jurídico.",
      criticidade: Criticidade.ALTA,
      naturezaUso: NaturezaUso.DIAGNOSTICO,
      grauAutonomia: GrauAutonomia.MEDIO,
      classificacaoRiscoAutomatico: ClassificacaoRisco.ALTO,
      classificacaoRiscoManual: ClassificacaoRisco.ALTO,
      areaAvaliadora: ["Direção Técnica", "Qualidade"],
      statusUso: StatusUso.APROVADO_COM_RESTRICOES,
      necessitaPlanoAcao: "Sim",
      descricaoPlanoAcao: "Auditoria quinzenal dos primeiros 1000 casos.",
      responsavelPlanoAcao: "Maria Oliveira",
      prazoPlanoAcao: dateStr,
      parecerTecnico: "Aprovado sob condição de revisão 100% humana.",
      observacoesGerais: "Projeto piloto estendido.",
      anexos: "Termo de responsabilidade técnica assinado.",
      statusAuditoria: StatusAuditoria.APROVADO,
      historico: [{ date: now, action: "Criação do registro" }]
    },
    {
      id: "IA-CEDRO-0003",
      createdAt: now,
      updatedAt: now,
      unidadeSetor: "Laboratório Central",
      responsavelPreenchimento: "Carlos Mendes",
      cargo: "Gestor de TI",
      dataRegistro: dateStr,
      utilizaIA: "Sim",
      nomeFerramenta: "AutoAnalyzer AI Module",
      fornecedor: "MegaRoche Systems",
      versao: "6.0",
      tipoIA: [TiposIA.EQUIPAMENTO_IA_EMBARCADA, TiposIA.ALGORITMO_APOIO_DECISAO],
      descricaoAtividade: "Módulo de IA embarcada no equipamento para liberação automática de resultados normais.",
      objetivos: [ObjetivosIA.AUTOMACAO, ObjetivosIA.PRODUTIVIDADE],
      etapaProcesso: EtapaProcesso.ANALITICA,
      beneficiosEsperados: "Liberação de 70% da rotina sem intervenção humana.",
      usaDadosPessoais: "Sim",
      usaDadosSensiveis: "Sim",
      quaisDados: "Resultados bioquímicos, dados de cadastro",
      dadosAnonimizados: "Não",
      envioFornecedorExterno: "Não",
      dadosTreinamentoModelo: "Não",
      obsProtecaoDados: "Processamento local no equipamento.",
      integradaSistemaInterno: "Sim",
      qualSistema: "LIS / Middleware",
      impactoResultadosLaboratoriais: "Sim",
      validacaoHumana: "Não",
      quemValida: "Ninguém (autolaboração)",
      registroLogDecisao: "Sim",
      ambienteHomologacao: "Não",
      obsIntegracao: "Sistema fechado do fabricante.",
      riscosIdentificados: "Sim",
      quaisRiscos: "Falha no algoritmo de validação automática, erro não detectado.",
      controlesImplementados: "Não",
      quaisControles: [],
      riscoResidual: RiscoResidual.ALTO,
      responsavelRisco: "Carlos Mendes",
      frequenciaReavaliacao: "Trimestral",
      obsRiscosControles: "Ausência de validação humana direta na liberação.",
      alinhadoLGPD: "Sim",
      politicaInterna: "Não",
      treinamentoColaboradores: "Não",
      documentacaoTecnica: "Sim",
      contratoProtecaoDados: "Não",
      controleAcessoPerfil: "Não",
      trilhaAuditoria: "Não",
      procedimentoIncidente: "Não",
      obsConformidade: "Necessita regularização urgente.",
      criticidade: Criticidade.ALTA,
      naturezaUso: NaturezaUso.TECNICO,
      grauAutonomia: GrauAutonomia.ALTO,
      classificacaoRiscoAutomatico: ClassificacaoRisco.CRITICO,
      classificacaoRiscoManual: ClassificacaoRisco.CRITICO,
      areaAvaliadora: ["Qualidade", "Direção Técnica"],
      statusUso: StatusUso.NAO_APROVADO,
      statusAuditoria: StatusAuditoria.NEGADO,
      necessitaPlanoAcao: "Sim",
      parecerTecnico: "Risco inaceitável sem validação humana e controles de acesso.",
      observacoesGerais: "Suspenso temporariamente.",
      anexos: "Relatório de incidentes anexo.",
      historico: [{ date: now, action: "Criação do registro" }]
    },
    {
      id: "IA-CEDRO-0004",
      createdAt: now,
      updatedAt: now,
      unidadeSetor: "NIT",
      responsavelPreenchimento: "Alice Tech",
      cargo: "Analista de Inovação",
      dataRegistro: dateStr,
      utilizaIA: "Sim",
      nomeFerramenta: "Generative Code Helper",
      fornecedor: "CodeLabs Inc",
      versao: "Beta 2.0",
      tipoIA: [TiposIA.IA_GENERATIVA],
      descricaoAtividade: "Assistente de geração de código para acelerar o desenvolvimento de ferramentas internas.",
      objetivos: [ObjetivosIA.PRODUTIVIDADE, ObjetivosIA.AUTOMACAO],
      etapaProcesso: EtapaProcesso.OUTRO,
      beneficiosEsperados: "Redução de 30% no tempo de codificação.",
      usaDadosPessoais: "Não",
      usaDadosSensiveis: "Não",
      quaisDados: "Snippets de código genéricos",
      dadosAnonimizados: "Sim",
      envioFornecedorExterno: "Sim",
      dadosTreinamentoModelo: "Não",
      obsProtecaoDados: "Nenhum dado sensível é enviado.",
      integradaSistemaInterno: "Não",
      impactoResultadosLaboratoriais: "Não",
      validacaoHumana: "Sim",
      quemValida: "Desenvolvedor responsável",
      registroLogDecisao: "Não",
      ambienteHomologacao: "Sim",
      riscosIdentificados: "Sim",
      quaisRiscos: "Geração de código com vulnerabilidades ou bugs.",
      controlesImplementados: "Sim",
      quaisControles: ["Revisão humana obrigatória", "Testes unitários"],
      riscoResidual: RiscoResidual.BAIXO,
      responsavelRisco: "Alice Tech",
      frequenciaReavaliacao: "Semestral",
      obsRiscosControles: "Código sempre revisado por um sênior.",
      alinhadoLGPD: "Sim",
      politicaInterna: "Sim",
      treinamentoColaboradores: "Sim",
      documentacaoTecnica: "Sim",
      contratoProtecaoDados: "Sim",
      controleAcessoPerfil: "Sim",
      trilhaAuditoria: "Não",
      procedimentoIncidente: "Sim",
      criticidade: Criticidade.BAIXA,
      naturezaUso: NaturezaUso.TECNICO,
      grauAutonomia: GrauAutonomia.MEDIO,
      classificacaoRiscoAutomatico: ClassificacaoRisco.BAIXO,
      classificacaoRiscoManual: ClassificacaoRisco.BAIXO,
      areaAvaliadora: ["TI"],
      statusUso: StatusUso.EM_AVALIACAO,
      statusAuditoria: StatusAuditoria.PENDENTE,
      obsIntegracao: "N/A",
      obsConformidade: "N/A",
      necessitaPlanoAcao: "Não",
      parecerTecnico: "Aguardando análise da TI.",
      observacoesGerais: "",
      anexos: "",
      historico: [{ date: now, action: "Criação do registro" }]
    },
    {
      id: "IA-CEDRO-0005",
      createdAt: now,
      updatedAt: now,
      unidadeSetor: "Marketing",
      responsavelPreenchimento: "Roberto Ads",
      cargo: "Coordenador de Marketing",
      dataRegistro: dateStr,
      utilizaIA: "Sim",
      nomeFerramenta: "Social Media Auto-Designer",
      fornecedor: "VisualAI Ltd",
      versao: "Full Access",
      tipoIA: [TiposIA.IA_GENERATIVA, TiposIA.ANALISE_IMAGENS],
      descricaoAtividade: "Criação de artes para redes sociais e análise de engajamento baseada em tendências.",
      objetivos: [ObjetivosIA.PRODUTIVIDADE],
      etapaProcesso: EtapaProcesso.OUTRO,
      beneficiosEsperados: "Padronização visual e rapidez nas postagens.",
      usaDadosPessoais: "Não",
      usaDadosSensiveis: "Não",
      quaisDados: "Imagens de banco de dados e textos publicitários.",
      dadosAnonimizados: "Sim",
      envioFornecedorExterno: "Sim",
      dadosTreinamentoModelo: "Sim",
      obsProtecaoDados: "Uso de prompts sem referências internas.",
      integradaSistemaInterno: "Não",
      impactoResultadosLaboratoriais: "Não",
      validacaoHumana: "Sim",
      quemValida: "Equipe criativa",
      registroLogDecisao: "Não",
      ambienteHomologacao: "Sim",
      riscosIdentificados: "Não",
      quaisRiscos: "Não identificado",
      controlesImplementados: "Sim",
      quaisControles: ["Revisão humana obrigatória"],
      riscoResidual: RiscoResidual.BAIXO,
      responsavelRisco: "Roberto Ads",
      frequenciaReavaliacao: "Anual",
      obsRiscosControles: "Validação da estética e direitos autorais.",
      alinhadoLGPD: "Sim",
      politicaInterna: "Sim",
      treinamentoColaboradores: "Sim",
      documentacaoTecnica: "Sim",
      contratoProtecaoDados: "Sim",
      controleAcessoPerfil: "Sim",
      trilhaAuditoria: "Não",
      procedimentoIncidente: "Não",
      criticidade: Criticidade.BAIXA,
      naturezaUso: NaturezaUso.ADMINISTRATIVO,
      grauAutonomia: GrauAutonomia.MEDIO,
      classificacaoRiscoAutomatico: ClassificacaoRisco.BAIXO,
      classificacaoRiscoManual: ClassificacaoRisco.BAIXO,
      areaAvaliadora: ["NIT"],
      statusUso: StatusUso.EM_TESTE_PILOTO,
      statusAuditoria: StatusAuditoria.PENDENTE,
      obsIntegracao: "N/A",
      obsConformidade: "N/A",
      necessitaPlanoAcao: "Não",
      parecerTecnico: "Aguardando análise do NIT.",
      observacoesGerais: "",
      anexos: "",
      historico: [{ date: now, action: "Criação do registro" }]
    },
    {
      id: "IA-CEDRO-0006",
      createdAt: now,
      updatedAt: now,
      unidadeSetor: "NIT",
      responsavelPreenchimento: "Admin Experimento",
      cargo: "Auditor AI",
      dataRegistro: dateStr,
      utilizaIA: "Sim",
      nomeFerramenta: "Data Science Optimizer",
      fornecedor: "Experimento Lab",
      versao: "v1",
      tipoIA: [TiposIA.MACHINE_LEARNING],
      descricaoAtividade: "Otimização de pipelines de dados sensíveis para pesquisa laboratorial.",
      objetivos: [ObjetivosIA.PRODUTIVIDADE, ObjetivosIA.REDUCAO_ERROS],
      etapaProcesso: EtapaProcesso.TI,
      beneficiosEsperados: "Aceleração de 50% no processamento de lotes de dados.",
      usaDadosPessoais: "Sim",
      usaDadosSensiveis: "Sim",
      quaisDados: "Metadados de exames, logs de processamento",
      dadosAnonimizados: "Sim",
      envioFornecedorExterno: "Não",
      dadosTreinamentoModelo: "Não",
      obsProtecaoDados: "Processamento local isolado.",
      integradaSistemaInterno: "Sim",
      qualSistema: "Data Lake Interno",
      impactoResultadosLaboratoriais: "Não",
      validacaoHumana: "Sim",
      quemValida: "Cientista de Dados",
      registroLogDecisao: "Sim",
      ambienteHomologacao: "Sim",
      obsIntegracao: "Conexão via gRPC.",
      riscosIdentificados: "Sim",
      quaisRiscos: "Possível overfitting em conjuntos pequenos.",
      controlesImplementados: "Sim",
      quaisControles: ["Validação cruzada", "Monitoramento de métricas"],
      riscoResidual: RiscoResidual.BAIXO,
      responsavelRisco: "Admin Experimento",
      frequenciaReavaliacao: "Mensal",
      obsRiscosControles: "Ambiente controlado.",
      alinhadoLGPD: "Sim",
      politicaInterna: "Sim",
      treinamentoColaboradores: "Sim",
      documentacaoTecnica: "Sim",
      contratoProtecaoDados: "Sim",
      controleAcessoPerfil: "Sim",
      trilhaAuditoria: "Sim",
      procedimentoIncidente: "Sim",
      obsConformidade: "OK",
      criticidade: Criticidade.BAIXA,
      naturezaUso: NaturezaUso.TECNICO,
      grauAutonomia: GrauAutonomia.MEDIO,
      classificacaoRiscoAutomatico: ClassificacaoRisco.BAIXO,
      classificacaoRiscoManual: ClassificacaoRisco.BAIXO,
      areaAvaliadora: ["NIT", "TI"],
      statusUso: StatusUso.EM_TESTE_PILOTO,
      necessitaPlanoAcao: "Não",
      parecerTecnico: "Aprovado para testes.",
      observacoesGerais: "Experimento de multi-IA.",
      anexos: "",
      statusAuditoria: StatusAuditoria.PENDENTE,
      historico: [{ date: now, action: "Criação do registro" }]
    }
  ];
}
