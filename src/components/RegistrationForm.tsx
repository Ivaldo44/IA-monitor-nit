/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Save, X, Info, AlertTriangle, ShieldCheck, Zap, Database, Share2, ClipboardCheck, Scale, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { 
  IARecord, TiposIA, ObjetivosIA, EtapaProcesso, RiscoResidual, 
  Criticidade, NaturezaUso, GrauAutonomia, ClassificacaoRisco, StatusUso 
} from "../types";
import { generateId, getRecords } from "../storage";

interface RegistrationFormProps {
  initialData?: IARecord | null;
  onSave: (record: IARecord) => void;
  onCancel: () => void;
}

// Helper components defined outside to prevent re-mounting focus loss issues
const InputGroup = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5 w-full group">
    <label className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-2 uppercase tracking-tight group-focus-within:text-brand-green transition-colors">
      <div className="size-1 rounded-full bg-black/10 dark:bg-white/20 group-focus-within:bg-brand-green group-focus-within:shadow-sm"></div>
      {label} {required && <span className="text-lab-red font-bold">*</span>}
    </label>
    {children}
  </div>
);

const RadioGroup = ({ 
  label, 
  value, 
  options, 
  onChange, 
  required 
}: { 
  label: string; 
  value: string; 
  options: string[]; 
  onChange: (val: string) => void; 
  required?: boolean 
}) => (
  <InputGroup label={label} required={required}>
    <div className="flex flex-wrap gap-3">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
            value === opt 
              ? "bg-brand-green text-black border-brand-green shadow-sm scale-[1.05]" 
              : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border-[var(--border-lab)] hover:border-[var(--text-main)] hover:text-[var(--text-bright)]"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </InputGroup>
);

const CheckboxGroup = ({ 
  label, 
  value, 
  options, 
  onToggle, 
  required 
}: { 
  label: string; 
  value: string[]; 
  options: string[]; 
  onToggle: (val: string) => void; 
  required?: boolean 
}) => (
  <InputGroup label={label} required={required}>
    <div className="flex flex-wrap gap-3">
      {options.map(opt => {
         const isSelected = value.includes(opt);
         return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
              isSelected 
                ? "bg-lab-cyan text-white border-lab-cyan shadow-sm scale-[1.05]" 
                : "bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border-[var(--border-lab)] hover:border-[var(--text-main)] hover:text-[var(--text-bright)]"
            }`}
          >
            {opt}
          </button>
         );
      })}
    </div>
  </InputGroup>
);

const TextArea = ({ 
  label, 
  value, 
  onChange, 
  required, 
  placeholder,
  className 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  required?: boolean; 
  placeholder?: string;
  className?: string;
}) => (
  <InputGroup label={label} required={required}>
    <textarea 
      className={className}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </InputGroup>
);

export default function RegistrationForm({ initialData, onSave, onCancel }: RegistrationFormProps) {
  const [formData, setFormData] = useState<Partial<IARecord>>({
    id: "",
    unidadeSetor: "",
    responsavelPreenchimento: "",
    cargo: "",
    dataRegistro: new Date().toISOString().split('T')[0],
    utilizaIA: "Sim",
    nomeFerramenta: "",
    fornecedor: "",
    versao: "",
    tipoIA: [],
    descricaoAtividade: "",
    objetivos: [],
    etapaProcesso: EtapaProcesso.OUTRO,
    beneficiosEsperados: "",
    usaDadosPessoais: "Não",
    usaDadosSensiveis: "Não",
    quaisDados: "",
    dadosAnonimizados: "Não",
    envioFornecedorExterno: "Não",
    dadosTreinamentoModelo: "Não",
    integradaSistemaInterno: "Não",
    impactoResultadosLaboratoriais: "Não",
    validacaoHumana: "Sim",
    riscosIdentificados: "Não",
    controlesImplementados: "Não",
    quaisControles: [],
    riscoResidual: RiscoResidual.NAO_AVALIADO,
    alinhadoLGPD: "Em avaliação",
    politicaInterna: "Não",
    treinamentoColaboradores: "Não",
    documentacaoTecnica: "Não se aplica",
    contratoProtecaoDados: "Não se aplica",
    statusUso: StatusUso.EM_AVALIACAO,
    necessitaPlanoAcao: "Não",
    areaAvaliadora: ["NIT"]
  });

  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const fetchAndSetId = async () => {
        const records = await getRecords();
        setFormData(prev => ({ ...prev, id: generateId(records.length) }));
      };
      fetchAndSetId();
    }
  }, [initialData]);

  const updateField = (field: keyof IARecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: "tipoIA" | "objetivos" | "quaisControles" | "areaAvaliadora", value: any) => {
    const current = (formData[field] as any[]) || [];
    const newVal = current.includes(value) 
      ? current.filter(v => v !== value) 
      : [...current, value];
    updateField(field, newVal);
  };

  // Automatic Risk Classification Logic
  useEffect(() => {
    let suggestedRisk = ClassificacaoRisco.BAIXO;

    const impactsResults = formData.impactoResultadosLaboratoriais === "Sim";
    const sensitiveData = formData.usaDadosSensiveis === "Sim";
    const personalData = formData.usaDadosPessoais === "Sim";
    const noHumanValidation = formData.validacaoHumana === "Não";
    const noLGPD = formData.alinhadoLGPD === "Não";
    const noControls = formData.controlesImplementados === "Não";
    const highCriticity = formData.criticidade === Criticidade.ALTA;

    if (noLGPD && (personalData || sensitiveData)) {
      suggestedRisk = ClassificacaoRisco.CRITICO;
    } else if (impactsResults && noControls) {
      suggestedRisk = ClassificacaoRisco.CRITICO;
    } else if (sensitiveData && noHumanValidation) {
      suggestedRisk = ClassificacaoRisco.CRITICO;
    } else if (impactsResults || highCriticity) {
      suggestedRisk = ClassificacaoRisco.ALTO;
    } else if (sensitiveData || personalData) {
      suggestedRisk = ClassificacaoRisco.MEDIO;
    } else if (formData.criticidade === Criticidade.MEDIA) {
      suggestedRisk = ClassificacaoRisco.MEDIO;
    }

    if (formData.classificacaoRiscoAutomatico !== suggestedRisk) {
      updateField("classificacaoRiscoAutomatico", suggestedRisk);
      // Only auto-update manual if user hasn't touched it (simplified logic)
      if (!formData.classificacaoRiscoManual) {
        updateField("classificacaoRiscoManual", suggestedRisk);
      }
    }
  }, [
    formData.impactoResultadosLaboratoriais,
    formData.usaDadosSensiveis,
    formData.usaDadosPessoais,
    formData.validacaoHumana,
    formData.alinhadoLGPD,
    formData.controlesImplementados,
    formData.criticidade
  ]);

  const sections = [
    { label: "Identificação", icon: FileText },
    { label: "Uso da IA", icon: Zap },
    { label: "Finalidade", icon: Info },
    { label: "Dados", icon: Database },
    { label: "Integração", icon: Share2 },
    { label: "Riscos", icon: AlertTriangle },
    { label: "Conformidade", icon: ShieldCheck },
    { label: "Classificação", icon: Scale },
    { label: "Aprovação", icon: ClipboardCheck },
    { label: "Obs", icon: FileText },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unidadeSetor || !formData.nomeFerramenta || !formData.responsavelPreenchimento) {
      alert("Por favor, preencha os campos obrigatórios da primeira seção.");
      setActiveSection(0);
      return;
    }
    
    const now = new Date().toISOString();
    const action = initialData ? "Atualização do registro" : "Criação do registro";
    const history = [...(formData.historico || []), { date: now, action }];
    
    onSave({
      ...formData,
      createdAt: initialData ? initialData.createdAt : now,
      updatedAt: now,
      historico: history,
    } as IARecord);
  };

  const sharedInputClass = "w-full p-4 bg-black/5 dark:bg-white/5 border border-[var(--border-lab)] rounded-2xl text-[var(--text-bright)] font-bold text-sm outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all placeholder:text-[var(--text-muted)] shadow-inner";

  return (
    <div className="bg-[var(--bg-main)] rounded-[2rem] shadow-xl dark:shadow-black/40 border border-[var(--border-lab)] overflow-hidden flex flex-col md:flex-row min-h-[700px] relative">
      {/* Sidebar Stepper - AI Lab Navigation */}
      <div className="bg-[var(--bg-sidebar)] md:w-72 p-6 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 border-b md:border-b-0 md:border-r border-[var(--border-lab)] scrollbar-hide relative z-10">
        <div className="hidden md:block text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide mb-6 px-4">Processo de Registro</div>
        {sections.map((sec, i) => (
          <button
            key={i}
            onClick={() => setActiveSection(i)}
            className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all whitespace-nowrap text-left group relative overflow-hidden ${
              activeSection === i 
                ? "bg-brand-green/10 text-brand-green font-bold" 
                : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            {activeSection === i && (
              <motion.div layoutId="form-active" className="absolute left-0 top-0 bottom-0 w-1 bg-brand-green" />
            )}
            <div className={`p-2 rounded-xl border transition-colors ${
              activeSection === i ? "bg-brand-green/20 border-brand-green/30" : "bg-black/5 dark:bg-white/5 border-[var(--border-lab)] group-hover:border-[var(--text-muted)]"
            }`}>
              <sec.icon size={16} className={activeSection === i ? "text-brand-green" : "text-[var(--text-muted)]"} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] opacity-40 font-mono tracking-tight text-[var(--text-muted)] uppercase text-left">Fase 0{i+1}</span>
              <span className="text-[13px] tracking-tight">{sec.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="p-10 flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[var(--border-lab)] pb-8">
             <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-3 py-1 bg-brand-orange/10 border border-brand-orange/30 rounded-full">
                    <p className="text-[10px] font-bold text-brand-orange uppercase tracking-wide">Etapa {activeSection + 1} de {sections.length}</p>
                  </div>
                  <div className="size-1 rounded-full bg-[var(--text-muted)]/20"></div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-tight">Conexão Segura Ativa</span>
                </div>
                <h2 className="text-4xl font-bold text-[var(--text-bright)] tracking-tight">
                  {sections[activeSection].label}
                </h2>
             </div>
             <div className="px-6 py-3 glass rounded-2xl font-mono text-xs font-bold text-brand-green border border-brand-green/20">
               Protocolo: {formData.id}
             </div>
          </div>

          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeSection === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="Unidade ou Setor" required>
                  <input 
                    className={sharedInputClass}
                    value={formData.unidadeSetor || ""}
                    onChange={(e) => updateField("unidadeSetor", e.target.value)}
                    placeholder="Ex: Hematologia, TI, Administrativo..."
                    required
                  />
                </InputGroup>
                <InputGroup label="Responsável pelo Preenchimento" required>
                  <input 
                    className={sharedInputClass}
                    value={formData.responsavelPreenchimento || ""}
                    onChange={(e) => updateField("responsavelPreenchimento", e.target.value)}
                    placeholder="Nome Completo"
                    required
                  />
                </InputGroup>
                <InputGroup label="Cargo ou Função" required>
                  <input 
                    className={sharedInputClass}
                    value={formData.cargo || ""}
                    onChange={(e) => updateField("cargo", e.target.value)}
                    placeholder="Sua função atual"
                    required
                  />
                </InputGroup>
                <InputGroup label="Data do Registro" required>
                  <input 
                    type="date"
                    className={sharedInputClass}
                    value={formData.dataRegistro || ""}
                    onChange={(e) => updateField("dataRegistro", e.target.value)}
                    required
                  />
                </InputGroup>
              </div>
            )}
            
            {/* ... other sections will follow the same pattern through shared styles ... */}
            {/* Updating the sharedInputClass for the Lab Look */}

            {activeSection === 1 && (
              <div className="space-y-6">
                <RadioGroup 
                  label="A atividade utiliza IA?" 
                  options={["Sim", "Não"]} 
                  value={formData.utilizaIA as string}
                  onChange={(val) => updateField("utilizaIA", val)}
                  required 
                />
                <InputGroup label="Nome da ferramenta / sistema / equipamento" required>
                  <input 
                    className={sharedInputClass}
                    value={formData.nomeFerramenta || ""}
                    onChange={(e) => updateField("nomeFerramenta", e.target.value)}
                  />
                </InputGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Fornecedor / Desenvolvedor" required>
                    <input 
                      className={sharedInputClass}
                      value={formData.fornecedor || ""}
                      onChange={(e) => updateField("fornecedor", e.target.value)}
                    />
                  </InputGroup>
                  <InputGroup label="Versão / Plano / Modelo">
                    <input 
                      className={sharedInputClass}
                      value={formData.versao || ""}
                      onChange={(e) => updateField("versao", e.target.value)}
                    />
                  </InputGroup>
                </div>
                <CheckboxGroup 
                  label="Tipo de IA" 
                  options={Object.values(TiposIA)} 
                  value={formData.tipoIA as any[]}
                  onToggle={(val) => handleArrayToggle("tipoIA", val)}
                  required 
                />
              </div>
            )}

            {activeSection === 2 && (
              <div className="space-y-6">
                <TextArea 
                  label="Descrição da atividade onde a IA é utilizada" 
                  value={formData.descricaoAtividade as string}
                  onChange={(val) => updateField("descricaoAtividade", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                  required 
                />
                <CheckboxGroup 
                  label="Objetivos do uso" 
                  options={Object.values(ObjetivosIA)} 
                  value={formData.objetivos as any[]}
                  onToggle={(val) => handleArrayToggle("objetivos", val)}
                  required 
                />
                <InputGroup label="Etapa do processo" required>
                  <select 
                    className={sharedInputClass}
                    value={formData.etapaProcesso}
                    onChange={(e) => updateField("etapaProcesso", e.target.value)}
                  >
                    {Object.values(EtapaProcesso).map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </InputGroup>
                <TextArea 
                  label="Benefícios esperados" 
                  value={formData.beneficiosEsperados as string}
                  onChange={(val) => updateField("beneficiosEsperados", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                />
              </div>
            )}


            {activeSection === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RadioGroup 
                    label="Utiliza dados pessoais?" 
                    options={["Sim", "Não"]} 
                    value={formData.usaDadosPessoais as string}
                    onChange={(val) => updateField("usaDadosPessoais", val)}
                    required 
                  />
                  <RadioGroup 
                    label="Utiliza dados sensíveis (saúde)?" 
                    options={["Sim", "Não"]} 
                    value={formData.usaDadosSensiveis as string}
                    onChange={(val) => updateField("usaDadosSensiveis", val)}
                    required 
                  />
                </div>
                <TextArea 
                  label="Quais dados são utilizados?" 
                  value={formData.quaisDados as string}
                  onChange={(val) => updateField("quaisDados", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                  required 
                />
                <RadioGroup 
                  label="Os dados são anonimizados?" 
                  options={["Sim", "Não", "Parcial"]} 
                  value={formData.dadosAnonimizados as string}
                  onChange={(val) => updateField("dadosAnonimizados", val)}
                  required 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RadioGroup 
                    label="Envio para fornecedor externo?" 
                    options={["Sim", "Não", "Não sei"]} 
                    value={formData.envioFornecedorExterno as string}
                    onChange={(val) => updateField("envioFornecedorExterno", val)}
                  />
                  <RadioGroup 
                    label="Usados para treinamento do modelo?" 
                    options={["Sim", "Não", "Não sei"]} 
                    value={formData.dadosTreinamentoModelo as string}
                    onChange={(val) => updateField("dadosTreinamentoModelo", val)}
                  />
                </div>
                <TextArea 
                  label="Observações sobre proteção de dados" 
                  value={formData.obsProtecaoDados as string}
                  onChange={(val) => updateField("obsProtecaoDados", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                />
              </div>
            )}

            {activeSection === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RadioGroup 
                    label="Integrada a sistema interno?" 
                    options={["Sim", "Não"]} 
                    value={formData.integradaSistemaInterno as string}
                    onChange={(val) => updateField("integradaSistemaInterno", val)}
                    required 
                  />
                  <InputGroup label="Qual sistema?">
                    <input className={sharedInputClass} value={formData.qualSistema || ""} onChange={(e) => updateField("qualSistema", e.target.value)} />
                  </InputGroup>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RadioGroup 
                    label="Impacta resultados laboratoriais?" 
                    options={["Sim", "Não"]} 
                    value={formData.impactoResultadosLaboratoriais as string}
                    onChange={(val) => updateField("impactoResultadosLaboratoriais", val)}
                    required 
                  />
                  <RadioGroup 
                    label="Existe validação humana?" 
                    options={["Sim", "Não"]} 
                    value={formData.validacaoHumana as string}
                    onChange={(val) => updateField("validacaoHumana", val)}
                    required 
                  />
                </div>
                <InputGroup label="Quem realiza a validação humana?">
                  <input className={sharedInputClass} value={formData.quemValida || ""} onChange={(e) => updateField("quemValida", e.target.value)} />
                </InputGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RadioGroup 
                    label="Existe log da decisão?" 
                    options={["Sim", "Não", "Não sei"]} 
                    value={formData.registroLogDecisao as string}
                    onChange={(val) => updateField("registroLogDecisao", val)}
                  />
                  <RadioGroup 
                    label="Ambiente de homologação?" 
                    options={["Sim", "Não", "Não sei"]} 
                    value={formData.ambienteHomologacao as string}
                    onChange={(val) => updateField("ambienteHomologacao", val)}
                  />
                </div>
                <TextArea 
                  label="Observações sobre integração" 
                  value={formData.obsIntegracao as string}
                  onChange={(val) => updateField("obsIntegracao", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                />
              </div>
            )}

            {activeSection === 5 && (
              <div className="space-y-6">
                <RadioGroup 
                  label="Riscos identificados?" 
                  options={["Sim", "Não"]} 
                  value={formData.riscosIdentificados as string}
                  onChange={(val) => updateField("riscosIdentificados", val)}
                  required 
                />
                <TextArea 
                  label="Se sim, quais riscos?" 
                  value={formData.quaisRiscos as string}
                  onChange={(val) => updateField("quaisRiscos", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                />
                <RadioGroup 
                  label="Controles implementados?" 
                  options={["Sim", "Não"]} 
                  value={formData.controlesImplementados as string}
                  onChange={(val) => updateField("controlesImplementados", val)}
                  required 
                />
                <CheckboxGroup 
                  label="Quais controles existem?" 
                  options={[
                    "Revisão humana obrigatória", "Restrição de acesso", "Controle de dados inseridos",
                    "Monitoramento de uso", "Logs e trilha de auditoria", "Validação técnica prévia",
                    "Treinamento dos usuários", "Controle de versão", "Plano de contingência"
                  ]} 
                  value={formData.quaisControles as any[]}
                  onToggle={(val) => handleArrayToggle("quaisControles", val)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <InputGroup label="Risco Residual">
                      <select className={sharedInputClass} value={formData.riscoResidual} onChange={(e) => updateField("riscoResidual", e.target.value)}>
                        {Object.values(RiscoResidual).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                   </InputGroup>
                   <InputGroup label="Responsável pelo risco">
                      <input className={sharedInputClass} value={formData.responsavelRisco || ""} onChange={(e) => updateField("responsavelRisco", e.target.value)} />
                   </InputGroup>
                </div>
                <TextArea 
                  label="Observações de riscos e controles" 
                  value={formData.obsRiscosControles as string}
                  onChange={(val) => updateField("obsRiscosControles", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                />
              </div>
            )}

            {activeSection === 6 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RadioGroup 
                  label="Alinhado com LGPD?" 
                  options={["Sim", "Não", "Em avaliação"]} 
                  value={formData.alinhadoLGPD as string}
                  onChange={(val) => updateField("alinhadoLGPD", val)}
                  required 
                />
                <RadioGroup 
                  label="Política interna?" 
                  options={["Sim", "Não"]} 
                  value={formData.politicaInterna as string}
                  onChange={(val) => updateField("politicaInterna", val)}
                  required 
                />
                <RadioGroup 
                  label="Treinamento colaboradores?" 
                  options={["Sim", "Não"]} 
                  value={formData.treinamentoColaboradores as string}
                  onChange={(val) => updateField("treinamentoColaboradores", val)}
                  required 
                />
                <RadioGroup 
                  label="Documentação técnica?" 
                  options={["Sim", "Não", "Não se aplica"]} 
                  value={formData.documentacaoTecnica as string}
                  onChange={(val) => updateField("documentacaoTecnica", val)}
                  required 
                />
                <RadioGroup 
                  label="Contrato Termo Dados?" 
                  options={["Sim", "Não", "Em avaliação", "Não se aplica"]} 
                  value={formData.contratoProtecaoDados as string}
                  onChange={(val) => updateField("contratoProtecaoDados", val)}
                  required 
                />
                <RadioGroup 
                  label="Controle de acesso?" 
                  options={["Sim", "Não", "Não sei"]} 
                  value={formData.controleAcessoPerfil as string}
                  onChange={(val) => updateField("controleAcessoPerfil", val)}
                  required 
                />
                <RadioGroup 
                  label="Trilha de auditoria?" 
                  options={["Sim", "Não", "Não sei"]} 
                  value={formData.trilhaAuditoria as string}
                  onChange={(val) => updateField("trilhaAuditoria", val)}
                  required 
                />
                <RadioGroup 
                  label="Procedimento incidente?" 
                  options={["Sim", "Não"]} 
                  value={formData.procedimentoIncidente as string}
                  onChange={(val) => updateField("procedimentoIncidente", val)}
                />
              </div>
            )}

            {activeSection === 7 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Criticidade" required>
                    <select className={sharedInputClass} value={formData.criticidade} onChange={(e) => updateField("criticidade", e.target.value)}>
                      <option value="">Selecione...</option>
                      {Object.values(Criticidade).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </InputGroup>
                  <InputGroup label="Natureza do Uso" required>
                    <select className={sharedInputClass} value={formData.naturezaUso} onChange={(e) => updateField("naturezaUso", e.target.value)}>
                      <option value="">Selecione...</option>
                      {Object.values(NaturezaUso).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </InputGroup>
                  <InputGroup label="Grau de Autonomia" required>
                    <select className={sharedInputClass} value={formData.grauAutonomia} onChange={(e) => updateField("grauAutonomia", e.target.value)}>
                      <option value="">Selecione...</option>
                      {Object.values(GrauAutonomia).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </InputGroup>
                </div>
                
                <div className="p-8 bg-black/5 dark:bg-white/[0.03] rounded-xl text-[var(--text-main)] shadow-sm relative overflow-hidden border-2 border-[var(--border-lab)] border-l-brand-green border-l-8">
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Classificação Automática de Risco</h3>
                    <div className="flex items-center gap-6">
                      <div className={`px-6 py-3 rounded border-2 font-black text-xl uppercase ${
                        formData.classificacaoRiscoAutomatico === ClassificacaoRisco.CRITICO ? "border-lab-red bg-lab-red/10 text-lab-red" :
                        formData.classificacaoRiscoAutomatico === ClassificacaoRisco.ALTO ? "border-brand-orange bg-brand-orange/10 text-brand-orange" :
                        formData.classificacaoRiscoAutomatico === ClassificacaoRisco.MEDIO ? "border-brand-orange bg-brand-orange/10 text-brand-orange" :
                        "border-brand-green bg-brand-green/10 text-brand-green"
                      }`}>
                        {formData.classificacaoRiscoAutomatico || "Em avaliação"}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed max-w-sm uppercase font-black tracking-wider">
                        Sistema de pontuação automática do núcleo de inovação tecnológica (NIT) baseado em impactos à assistência e dados sensíveis.
                      </p>
                    </div>
                    
                    <div className="h-px bg-[var(--border-lab)]" />
 
                    <InputGroup label="Classificação de Risco Manual (Ajuste Final)" required>
                      <select 
                        className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-lab)] rounded-lg text-[var(--text-bright)] font-bold outline-none focus:ring-2 focus:ring-brand-green/30" 
                        value={formData.classificacaoRiscoManual} 
                        onChange={(e) => updateField("classificacaoRiscoManual", e.target.value)}
                      >
                        {Object.values(ClassificacaoRisco).map(cr => <option key={cr} value={cr} className="bg-[var(--bg-sidebar)]">{cr}</option>)}
                      </select>
                    </InputGroup>
                    <TextArea 
                      label="Justificativa para classificação manual" 
                      value={formData.justificativaAlteracaoRisco || ""}
                      onChange={(val) => updateField("justificativaAlteracaoRisco", val)}
                      className={`${sharedInputClass} min-h-[100px]`}
                    />
                  </div>
                  <img src="https://raw.githubusercontent.com/nitlabcedro/assets/refs/heads/main/Ativo%206.png" alt="" className="absolute right-[-30px] top-[-30px] size-56 opacity-5 -rotate-12 brightness-0 invert pointer-events-none" />
                </div>
              </div>
            )}

            {activeSection === 8 && (
              <div className="space-y-6">
                <CheckboxGroup 
                  label="Área Avaliadora" 
                  options={["Qualidade", "TI", "Compliance", "Jurídico/LGPD", "Direção Técnica", "NIT", "Gestão", "Outra"]} 
                  value={formData.areaAvaliadora as any[]}
                  onToggle={(val) => handleArrayToggle("areaAvaliadora", val)}
                  required 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Status do Uso" required>
                    <select className={sharedInputClass} value={formData.statusUso} onChange={(e) => updateField("statusUso", e.target.value)}>
                      {Object.values(StatusUso).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </InputGroup>
                  <RadioGroup 
                    label="Necessita Plano de Ação?" 
                    options={["Sim", "Não"]} 
                    value={formData.necessitaPlanoAcao as string}
                    onChange={(val) => updateField("necessitaPlanoAcao", val)}
                    required 
                  />
                </div>
                {formData.necessitaPlanoAcao === "Sim" && (
                   <div className="p-6 bg-amber-50 border border-amber-100 rounded-xl space-y-4 shadow-sm">
                      <TextArea 
                        label="Descrição do Plano de Ação" 
                        value={formData.descricaoPlanoAcao as string}
                        onChange={(val) => updateField("descricaoPlanoAcao", val)}
                        className={`${sharedInputClass} min-h-[100px]`}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Responsável">
                           <input className={sharedInputClass} value={formData.responsavelPlanoAcao || ""} onChange={(e) => updateField("responsavelPlanoAcao", e.target.value)} />
                        </InputGroup>
                        <InputGroup label="Prazo">
                           <input type="date" className={sharedInputClass} value={formData.prazoPlanoAcao || ""} onChange={(e) => updateField("prazoPlanoAcao", e.target.value)} />
                        </InputGroup>
                      </div>
                   </div>
                )}
                <TextArea 
                  label="Parecer técnico da área avaliadora" 
                  value={formData.parecerTecnico as string}
                  onChange={(val) => updateField("parecerTecnico", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                  required 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <InputGroup label="Data Aprovação">
                      <input type="date" className={sharedInputClass} value={formData.dataAprovacao || ""} onChange={(e) => updateField("dataAprovacao", e.target.value)} />
                   </InputGroup>
                   <InputGroup label="Próxima Revisão">
                      <input type="date" className={sharedInputClass} value={formData.proximaRevisao || ""} onChange={(e) => updateField("proximaRevisao", e.target.value)} />
                   </InputGroup>
                </div>
              </div>
            )}

            {activeSection === 9 && (
              <div className="space-y-6">
                <TextArea 
                  label="Observações Gerais" 
                  value={formData.observacoesGerais as string}
                  onChange={(val) => updateField("observacoesGerais", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                />
                <TextArea 
                  label="Anexos/Documentos Relacionados" 
                  value={formData.anexos as string}
                  onChange={(val) => updateField("anexos", val)}
                  className={`${sharedInputClass} min-h-[100px]`}
                  placeholder="Descreva links, evidências ou referências a documentos físicos." 
                />
                
                <div className="bg-black/5 dark:bg-slate-50 rounded-3xl p-6 border border-[var(--border-lab)] italic text-[var(--text-muted)] text-sm">
                   Dica: O histórico de alterações é registrado automaticamente ao salvar este formulário.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-[var(--border-lab)] bg-black/5 dark:bg-white/[0.02] flex flex-col md:flex-row gap-6 justify-between items-center relative z-10">
          <button type="button" onClick={onCancel} className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-lab-red transition-all uppercase tracking-tight group">
            <X size={14} className="group-hover:scale-125 transition-transform" /> Cancelar Registro
          </button>
          <div className="flex gap-4">
             {activeSection > 0 && (
               <button 
                 type="button" 
                 onClick={() => setActiveSection(s => s - 1)} 
                 className="px-8 py-3 bg-black/5 dark:bg-white/5 border border-[var(--border-lab)] text-[var(--text-muted)] text-xs font-bold uppercase tracking-tight rounded-xl hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--text-bright)] transition-all active:scale-95"
               >
                 Voltar
               </button>
             )}
             {activeSection < sections.length - 1 ? (
               <button 
                 type="button" 
                 onClick={() => setActiveSection(s => s + 1)} 
                 className="px-10 py-3 bg-lab-blue text-white text-xs font-bold uppercase tracking-tight rounded-xl hover:bg-lab-blue/80 transition-all shadow-xl active:scale-95 flex items-center gap-2"
               >
                 Próxima Etapa <ChevronRight size={14} />
               </button>
             ) : (
               <button 
                 type="submit" 
                 className="px-10 py-3 bg-brand-green text-black text-xs font-bold uppercase tracking-tight rounded-xl hover:bg-brand-green/80 transition-all shadow-xl active:scale-95 flex items-center gap-2"
               >
                 Salvar Registro <Save size={14} />
               </button>
             )}
          </div>
        </div>
      </form>
    </div>
  );
}
