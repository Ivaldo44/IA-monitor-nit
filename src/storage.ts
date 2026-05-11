/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./lib/supabase";
import {
  IARecord,
  StatusUso,
  Criticidade,
  ClassificacaoRisco,
  TiposIA,
  ObjetivosIA,
  EtapaProcesso,
  NaturezaUso,
  GrauAutonomia,
  RiscoResidual
} from "./types";

const STORAGE_KEY = "cedro_ia_inventory";

export const getRecords = async (): Promise<IARecord[]> => {
  try {
    console.log('🔍 Buscando registros no Supabase...');
    const { data, error } = await supabase
      .from('ia_records')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar no Supabase:', error);
      throw error;
    }

    if (data && data.length > 0) {
      console.log(`✅ ${data.length} registros encontrados no Supabase.`);
      // Prioritize data from the 'data' JSONB column, but fallback to individual columns if necessary
      const mappedData = data.map(item => {
        if (item.data) {
          const record = item.data as IARecord;
          // Ensure ID is synced from column if mismatch
          record.id = item.id;
          return record;
        }
        // Fallback reconstruction
        return {
          id: item.id,
          unidadeSetor: item.unidade_setor || '',
          responsavelPreenchimento: item.responsavel_preenchimento || '',
          cargo: item.cargo || '',
          dataRegistro: item.data_registro || new Date().toISOString().split('T')[0],
          utilizaIA: item.utiliza_ia || '',
          nomeFerramenta: item.nome_ferramenta || '',
          fornecedor: item.fornecedor || '',
          statusUso: (item.status_uso as StatusUso) || StatusUso.EM_AVALIACAO,
          classificacaoRiscoManual: (item.classificacao_risco as ClassificacaoRisco) || ClassificacaoRisco.BAIXO,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
          historico: []
        } as any as IARecord;
      });

      // Sync local storage with what's in the cloud
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedData));
      return mappedData;
    }

    console.log('ℹ️ Supabase retornou 0 registros.');

    // Supabase is empty. Let's see if we have local data to push.
    const localDataStr = localStorage.getItem(STORAGE_KEY);
    if (localDataStr) {
      try {
        const localRecords: IARecord[] = JSON.parse(localDataStr);
        if (localRecords.length > 0) {
          console.log('☁️ Enviando dados locais para o Supabase que está vazio...');
          // Push local records to Supabase in background
          saveRecordsToSupabase(localRecords).catch(err => console.error('Initial cloud sync failed:', err));
          return localRecords;
        }
      } catch (e) {
        console.error('Failed to parse local records for cloud sync:', e);
      }
    }

    console.log('💡 Utilizando registros de exemplo (tudo vazio).');
    // Completely empty everywhere? Use examples.
    const examples = getExampleRecords();
    await saveRecordsToSupabase(examples).catch(err => console.error('Failed to save examples to cloud:', err));
    return examples;
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getExampleRecords();
  }
};

export const addRecord = async (record: IARecord) => {
  try {
    console.log('☁️ Tentando salvar registro no Supabase:', record.id);
    const { error } = await supabase
      .from('ia_records')
      .upsert({ 
        id: record.id, 
        data: record,
        updated_at: new Date().toISOString(),
        unidade_setor: record.unidadeSetor,
        responsavel_preenchimento: record.responsavelPreenchimento,
        cargo: record.cargo,
        data_registro: record.dataRegistro,
        utiliza_ia: record.utilizaIA,
        nome_ferramenta: record.nomeFerramenta,
        fornecedor: record.fornecedor,
        status_uso: record.statusUso,
        classificacao_risco: record.classificacaoRiscoManual
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
  
  // Local fallback (Simples, sem chamar getRecords para evitar círculo)
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    const records: IARecord[] = localData ? JSON.parse(localData) : [];
    const index = records.findIndex(r => r.id === record.id);
    if (index === -1) records.push(record);
    else records[index] = record;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Local sync failed:', e);
  }
};

export const saveRecordsToSupabase = async (records: IARecord[]) => {
  console.log(`Syncing ${records.length} records to Supabase...`);
  for (const record of records) {
    await addRecord(record);
  }
};

export const updateRecord = async (record: IARecord) => {
  return addRecord(record); // Upsert handles update
};

export const addOrUpdateRecord = async (record: IARecord) => {
  return addRecord(record);
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

export const generateId = (count: number): string => {
  return `IA-CEDRO-${(count + 1).toString().padStart(4, "0")}`;
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
      necessitaPlanoAcao: "Sim",
      descricaoPlanoAcao: "Contratação de consultoria para validação de software e treinamento.",
      responsavelPlanoAcao: "Direção Técnica",
      prazoPlanoAcao: dateStr,
      parecerTecnico: "Risco inaceitável sem validação humana e controles de acesso.",
      observacoesGerais: "Suspenso temporariamente.",
      anexos: "Relatório de incidentes anexo.",
      historico: [{ date: now, action: "Criação do registro" }]
    }
  ];
}
