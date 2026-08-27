import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, CheckCircle2, FileText, Plus, Trash2, 
  Zap, Clock, Activity, Search, Camera, Download, Loader2, X, User,
  Filter, CalendarRange, RotateCcw, Lock, LogOut, KeyRound, HelpCircle, ChevronDown, ChevronUp, BookOpen, Sparkles
} from 'lucide-react';

const PRESET_MODELS = [
  'HB20', 'Argo', 'Mobi', 'Onix', 'Renegade', 
  'Compass', 'Tracker', 'Kicks', 'Strada', 'Polo', 'Saveiro', 'Outro'
];

class SimpleStore {
  constructor() {
    this.state = {
      records: [],
      operators: [
        { id: '1', name: 'Operador Padrão', matricula: '12345', pin: '1234' }
      ],
      currentOperator: null
    };
    this.listeners = new Set();
  }

  init() {
    try {
      const localRecs = localStorage.getItem('fleet_recs_lean_v3');
      if (localRecs) {
        this.state.records = JSON.parse(localRecs);
      }
      const localOps = localStorage.getItem('fleet_ops_v3');
      if (localOps) {
        this.state.operators = JSON.parse(localOps);
      } else {
        localStorage.setItem('fleet_ops_v3', JSON.stringify(this.state.operators));
      }
      const activeOp = localStorage.getItem('fleet_current_op_v3');
      if (activeOp) {
        this.state.currentOperator = JSON.parse(activeOp);
      }
    } catch (e) {
      console.warn('Erro ao carregar do Storage:', e);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.state));
    try {
      localStorage.setItem('fleet_recs_lean_v3', JSON.stringify(this.state.records));
      localStorage.setItem('fleet_ops_v3', JSON.stringify(this.state.operators));
      if (this.state.currentOperator) {
        localStorage.setItem('fleet_current_op_v3', JSON.stringify(this.state.currentOperator));
      } else {
        localStorage.removeItem('fleet_current_op_v3');
      }
    } catch (e) {
      console.error('Falha ao salvar:', e);
    }
  }

  setState(updater) {
    const nextState = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...nextState };
    this.notify();
  }
}

const storeInstance = new SimpleStore();
storeInstance.init();

function useAppStore() {
  const [state, setState] = useState(storeInstance.getState());

  useEffect(() => {
    const unsubscribe = storeInstance.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    login: (matricula, pin) => {
      const op = state.operators.find(o => o.matricula === matricula && o.pin === pin);
      if (op) {
        storeInstance.setState({ currentOperator: op });
        return true;
      }
      return false;
    },
    registerOperator: (name, matricula, pin) => {
      const existing = state.operators.find(o => o.matricula === matricula);
      if (existing) return false;
      const newOp = { id: Date.now().toString(), name, matricula, pin };
      storeInstance.setState(s => ({
        operators: [...s.operators, newOp],
        currentOperator: newOp
      }));
      return true;
    },
    recoverPin: (matricula) => {
      const op = state.operators.find(o => o.matricula === matricula);
      return op ? op.pin : null;
    },
    logout: () => {
      storeInstance.setState({ currentOperator: null });
    },
    addRecord: (recordData) => {
      const op = storeInstance.getState().currentOperator;
      const newRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        operatorId: op ? op.id : 'unknown',
        operatorName: op ? op.name : 'Operador',
        ...recordData
      };
      storeInstance.setState((s) => ({
        records: [newRecord, ...s.records]
      }));
      return newRecord;
    },
    deleteRecord: (id) => {
      storeInstance.setState((s) => ({
        records: s.records.filter((r) => r.id !== id)
      }));
    }
  };
}

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const getOperationalDate = (dateParam) => {
  const d = new Date(dateParam);
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState('lavagem');
  const [toast, setToast] = useState(null);

  if (!store.currentOperator) {
    return <LoginScreen store={store} showToast={(msg, type) => {
      setToast({ message: msg, type: type || 'success' });
      setTimeout(() => setToast(null), 3000);
    }} toast={toast} />;
  }

  const myRecords = store.records.filter(r => r.operatorId === store.currentOperator.id);
  const todayStr = getOperationalDate(new Date());
  const todayCount = myRecords.filter(r => getOperationalDate(r.timestamp) === todayStr).length;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-100 flex flex-col font-sans w-full overflow-x-hidden selection:bg-emerald-500/30">
      
      {toast && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4 animate-bounce">
          <div className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-500 text-slate-900 border-emerald-400 shadow-emerald-500/20' 
              : 'bg-red-500 text-white border-red-400 shadow-red-500/20'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {toast.message}
          </div>
        </div>
      )}

      <header className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-xl text-slate-900">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-white">
              Pátio<span className="text-emerald-400">Rápido</span>
            </h1>
            <p className="text-[10px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" /> {store.currentOperator.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hoje</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Activity className="w-4 h-4" />
              <span className="text-2xl font-black leading-none">{todayCount}</span>
            </div>
          </div>

          <button
            onClick={() => store.logout()}
            title="Sair da Conta"
            className="p-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-red-400 rounded-xl transition-colors border border-slate-700"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-4 max-w-lg w-full mx-auto pb-28">
        {activeTab === 'lavagem' && <RegistroTab store={store} showToast={showToast} />}
        {activeTab === 'historico' && <HistoricoTab store={store} todayStr={todayStr} showToast={showToast} myRecords={myRecords} />}
        {activeTab === 'ajuda' && <AjudaTab />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-lg border-t border-slate-700 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-lg mx-auto grid grid-cols-3 h-16 sm:h-20">
          <button
            onClick={() => setActiveTab('lavagem')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'lavagem' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Zap className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === 'lavagem' ? 'fill-emerald-400/20' : ''}`} />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Registrar</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'historico' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <FileText className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === 'historico' ? 'fill-emerald-400/20' : ''}`} />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab('ajuda')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'ajuda' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <BookOpen className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === 'ajuda' ? 'fill-emerald-400/20' : ''}`} />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Como Usar</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function LoginScreen({ store, showToast, toast }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  
  const [matricula, setMatricula] = useState('');
  const [pin, setPin] = useState('');
  const [nome, setNome] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!matricula || !pin) {
      showToast('Preencha a matrícula e o PIN!', 'error');
      return;
    }
    const success = store.login(matricula, pin);
    if (success) {
      showToast('Login efetuado com sucesso!');
    } else {
      showToast('Matrícula ou PIN incorretos!', 'error');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!nome || !matricula || pin.length < 4) {
      showToast('Preencha todos os campos e use um PIN de 4 dígitos!', 'error');
      return;
    }
    const success = store.registerOperator(nome, matricula, pin);
    if (success) {
      showToast('Operador cadastrado e logado!');
    } else {
      showToast('Esta matrícula já está cadastrada!', 'error');
    }
  };

  const handleRecover = (e) => {
    e.preventDefault();
    if (!matricula) {
      showToast('Informe sua matrícula!', 'error');
      return;
    }
    const foundPin = store.recoverPin(matricula);
    if (foundPin) {
      showToast(`PIN recuperado: ${foundPin}`, 'success');
      setIsRecovering(false);
    } else {
      showToast('Matrícula não encontrada!', 'error');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 py-8">
      {toast && (
        <div className="fixed top-10 left-0 right-0 z-50 flex justify-center px-4 animate-bounce">
          <div className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl border ${
            toast.type === 'success' ? 'bg-emerald-500 text-slate-900 border-emerald-400' : 'bg-red-500 text-white border-red-400'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-md w-full space-y-6">
        
        <div className="bg-slate-800/90 border border-emerald-500/30 rounded-3xl p-5 shadow-xl">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="w-full flex items-center justify-between text-emerald-400 font-bold text-sm"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              <span>Guia Rápido de Acesso</span>
            </div>
            {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHelp && (
            <div className="mt-4 pt-3 border-t border-slate-700 space-y-3 text-xs text-slate-300 leading-relaxed animate-fadeIn">
              <p>
                <strong className="text-emerald-400">1. Cadastro:</strong> Clique em <span className="text-white font-semibold">"Criar Nova Conta"</span>, informe seu nome, matrícula e crie um PIN de 4 dígitos.
              </p>
              <p>
                <strong className="text-emerald-400">2. Acesso:</strong> Digite sua matrícula e PIN para entrar com privacidade total nas suas lavagens.
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-500 text-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Car className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Pátio<span className="text-emerald-400">Rápido</span>
            </h1>
            <p className="text-xs text-slate-400">Controle Individual de Pátio</p>
          </div>

          {!isRegistering && !isRecovering && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Matrícula</label>
                <input 
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ex: 12345"
                  className="w-full bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 focus:border-emerald-500 outline-none font-mono font-bold text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">PIN (4 Dígitos)</label>
                <input 
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 focus:border-emerald-500 outline-none font-mono font-bold text-center text-xl tracking-widest"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mt-2"
              >
                Entrar no Turno
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsRecovering(true)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Esqueci meu PIN
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  Criar Nova Conta
                </button>
              </div>
            </form>
          )}

          {isRegistering && (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider text-center mb-2">Cadastrar Novo Operador</h2>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                <input 
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 focus:border-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Matrícula</label>
                <input 
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ex: 12345"
                  className="w-full bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 focus:border-emerald-500 outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Criar PIN (4 Dígitos)</label>
                <input 
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 focus:border-emerald-500 outline-none font-mono font-bold text-center text-xl tracking-widest"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mt-2"
              >
                Cadastrar e Entrar
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-xs text-slate-400 hover:text-white font-bold"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          )}

          {isRecovering && (
            <form onSubmit={handleRecover} className="space-y-4">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider text-center mb-2">Recuperar PIN</h2>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Informe sua Matrícula</label>
                <input 
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ex: 12345"
                  className="w-full bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 focus:border-emerald-500 outline-none font-mono text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mt-2"
              >
                Consultar PIN
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecovering(false)}
                  className="text-xs text-slate-400 hover:text-white font-bold"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function RegistroTab({ store, showToast }) {
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('HB20');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (placa.trim().length < 6) {
      showToast('Digite uma placa válida!', 'error');
      return;
    }

    store.addRecord({
      placa: placa.toUpperCase().trim(),
      modelo
    });

    showToast('Lavagem Registrada com Sucesso!');
    setPlaca('');
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAI(true);
    try {
      const base64Str = await fileToBase64(file);
      const base64Data = base64Str.split(',')[1];

      // Variável de ambiente segura para a chave de API do Gemini
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: `Analise a imagem deste veículo. 
1. Leia a placa e retorne apenas letras e números (ex: ABC1D23). Se não achar, use "ERRO".
2. Identifique o modelo do carro (ex: HB20, Onix, Compass, Corolla, etc). Tente ser específico. Se não reconhecer, use "ERRO".
Retorne ESTRITAMENTE em formato JSON: {"placa": "ABC1D23", "modelo": "NomeDoModelo"}` },
            { inlineData: { mimeType: file.type, data: base64Data } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      try {
        const parsed = JSON.parse(text || "{}");
        const placaResult = parsed.placa || 'ERRO';
        
        if (placaResult !== 'ERRO' && placaResult.length >= 6) {
          const cleanPlaca = placaResult.replace(/[^A-Za-z0-9]/g, '').substring(0, 7).toUpperCase();
          setPlaca(cleanPlaca);
          
          if (parsed.modelo && parsed.modelo !== 'ERRO') {
             const modelName = parsed.modelo.charAt(0).toUpperCase() + parsed.modelo.slice(1).toLowerCase();
             const matchedPreset = PRESET_MODELS.find(m => m.toLowerCase() === modelName.toLowerCase()) || modelName;
             setModelo(matchedPreset);
             showToast(`Placa e modelo (${matchedPreset}) detectados!`);
          } else {
             showToast('Placa identificada! (Modelo não reconhecido)');
          }
        } else {
          showToast('Não foi possível ler a placa. Digite manualmente.', 'error');
        }
      } catch (e) {
        console.error("Erro ao fazer parse do JSON da IA:", e);
        showToast('Erro ao interpretar dados da imagem.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao processar imagem.', 'error');
    } finally {
      setIsProcessingAI(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="bg-slate-800 p-4 sm:p-6 rounded-3xl border border-slate-700 shadow-lg relative overflow-hidden">
          {isProcessingAI && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-emerald-400">
              <Loader2 className="w-10 h-10 animate-spin mb-2" />
              <span className="font-bold tracking-widest text-sm uppercase">Lendo Placa...</span>
            </div>
          )}

          <label className="block text-center text-sm font-bold uppercase text-slate-400 mb-4 tracking-widest">
            Placa do Veículo
          </label>
          
          <div className="flex items-stretch bg-slate-900 rounded-2xl border-2 border-slate-700 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all overflow-hidden h-16 sm:h-24 shadow-inner">
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7))}
              placeholder="ABC1D23"
              className="flex-1 bg-transparent text-white text-center text-3xl sm:text-5xl font-black font-mono w-full outline-none placeholder:text-slate-700/50"
            />
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleCameraCapture}
              ref={fileInputRef}
              className="hidden"
              id="camera-input"
            />
            
            <label 
              htmlFor="camera-input"
              className="w-20 sm:w-28 shrink-0 bg-slate-700/40 hover:bg-slate-700 text-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-colors active:bg-slate-600 border-l-2 border-slate-700"
            >
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300">Foto</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider px-1">
            Modelo Rápido
          </label>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            {!PRESET_MODELS.includes(modelo) && (
              <button
                type="button"
                onClick={() => setModelo(modelo)}
                className="px-2 py-3 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 bg-emerald-500 text-slate-900 shadow-md shadow-emerald-500/20 col-span-1 truncate"
              >
                {modelo} ✨
              </button>
            )}
            {PRESET_MODELS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModelo(m)}
                className={`px-1 py-3 sm:px-4 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all active:scale-95 truncate ${
                  modelo === m
                    ? 'bg-emerald-500 text-slate-900 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessingAI}
          className="w-full min-h-[60px] bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 sm:py-5 rounded-2xl text-lg sm:text-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-transform active:scale-95 mt-4 disabled:opacity-50"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
          Registrar Lavagem
        </button>
      </form>
    </div>
  );
}

function HistoricoTab({ store, todayStr, showToast, myRecords }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [isCustomDate, setIsCustomDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const records = myRecords.filter(r => {
    const matchesSearch = !searchTerm || 
                          r.placa.includes(searchTerm.toUpperCase()) || 
                          r.modelo.toUpperCase().includes(searchTerm.toUpperCase());
    
    if (!matchesSearch) return false;

    if (isCustomDate && startDate && endDate) {
      const rTime = new Date(r.timestamp).getTime();
      const sTime = new Date(startDate).getTime();
      const eTime = new Date(endDate).getTime();
      return rTime >= sTime && rTime <= eTime;
    } 
    
    if (!isCustomDate) {
      return getOperationalDate(r.timestamp) === todayStr;
    }

    return true;
  });

  const generatePDF = async () => {
    if (records.length === 0) {
      showToast('Nenhum registro para exportar no período.', 'error');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      showToast('Gerando PDF...', 'success');
      
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
      
      const doc = new window.jspdf.jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const primaryColor = [0, 100, 60];
      const textColor = 40;

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PÁTIO RÁPIDO • CONTROLE INDIVIDUAL DE HIGIENIZAÇÃO', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const now = new Date();
      const emitStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');
      const protocol = `PROT-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Date.now().toString().slice(-4)}`;
      doc.text(`Operador: ${store.currentOperator.name} (Matrícula: ${store.currentOperator.matricula}) | Emissão: ${emitStr}`, 14, 20);

      doc.setFillColor(0, 150, 80);
      doc.roundedRect(pageWidth - 46, 8, 32, 12, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('SITUAÇÃO:', pageWidth - 42, 13);
      doc.setFontSize(8);
      doc.text('TURNO ATIVO', pageWidth - 42, 17);

      doc.setTextColor(textColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE TURNO - INDIVIDUAL', 14, 40);

      let dateSubtitle = '';
      if (isCustomDate) {
        if (startDate && endDate) {
          const startStr = new Date(startDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
          const endStr = new Date(endDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
          dateSubtitle = `Período: ${startStr} até ${endStr}`;
        } else {
          dateSubtitle = 'Período: Filtro Aberto (Todo o Histórico)';
        }
      } else {
        const opDate = new Date();
        if (opDate.getHours() < 6) opDate.setDate(opDate.getDate() - 1);
        
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let dateStr = opDate.toLocaleDateString('pt-BR', dateOptions);
        dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        dateSubtitle = `Data da Operação: ${dateStr}`;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(dateSubtitle, 14, 46);

      const total = records.length;

      const startY = 52;
      doc.setDrawColor(220);
      doc.setLineWidth(0.5);

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, startY, pageWidth - 28, 18, 3, 3, 'FD');
      
      doc.setTextColor(textColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALHES DO OPERADOR / TURNO:', 18, startY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Responsável: ${store.currentOperator.name} | Ritmo de Operação: Contínuo`, 18, startY + 13);

      const boxY = startY + 22;
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(14, boxY, pageWidth - 28, 22, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('TOTAL PROCESSADO', 18, boxY + 7);
      doc.setFontSize(18);
      doc.text(total.toString(), 18, boxY + 16);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('veículos higienizados', 28 + doc.getTextWidth(total.toString()), boxY + 16);

      const tableStartY = boxY + 28;

      const tableData = records.map((r, index) => {
        const time = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const date = new Date(r.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return [
          (index + 1).toString().padStart(2, '0'),
          `${date} às ${time}`,
          r.placa,
          r.modelo
        ];
      });

      doc.autoTable({
        startY: tableStartY,
        head: [['#', 'Data / Hora', 'Placa', 'Marca / Modelo']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, textColor: textColor },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`Relatorio_Turno_${store.currentOperator.matricula}_${todayStr}.pdf`);
      showToast('PDF Baixado com Sucesso!');

    } catch (error) {
      console.error(error);
      showToast('Erro ao gerar o PDF.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar placa..."
            className="w-full bg-slate-800 text-white pl-10 pr-3 py-3 sm:py-4 rounded-2xl border border-slate-700 focus:border-emerald-500 outline-none font-semibold text-base"
          />
        </div>
        
        <button
          onClick={() => setIsCustomDate(!isCustomDate)}
          className={`px-3 min-w-[65px] rounded-2xl flex flex-col items-center justify-center font-bold transition-all active:scale-95 shadow-lg ${
            isCustomDate 
              ? 'bg-emerald-500 text-slate-900 shadow-emerald-500/20' 
              : 'bg-slate-700 text-slate-300 shadow-none hover:bg-slate-600'
          }`}
        >
          <Filter className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-black uppercase tracking-wider">Filtro</span>
        </button>

        <button
          onClick={generatePDF}
          disabled={isGeneratingPDF}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-3 min-w-[80px] rounded-2xl flex flex-col items-center justify-center font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
        >
          {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin mb-1" /> : <Download className="w-5 h-5 mb-1" />}
          <span className="text-[9px] font-black uppercase tracking-wider">Turno PDF</span>
        </button>
      </div>

      {isCustomDate && (
        <div className="bg-slate-800 p-4 rounded-3xl border border-emerald-500/30 animate-fadeIn shadow-lg shadow-emerald-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <CalendarRange className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Filtrar por Data e Hora</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Início</label>
              <input 
                type="datetime-local" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fim</label>
              <input 
                type="datetime-local" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setIsCustomDate(false);
              showToast('Filtro limpo! Voltando ao dia atual.');
            }}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-600"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            Limpar Filtro e Voltar ao Dia Atual
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            Selecione o intervalo do seu turno (ex: 23:00 do dia 25 até 05:00 do dia 26)
          </p>
        </div>
      )}

      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="font-bold text-slate-300">
            {searchTerm ? 'Resultados da Busca' : 'Meu Histórico Individual'}
          </h2>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded-lg text-slate-300">{records.length} carros</span>
        </div>

        {records.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum veículo registrado por você no período.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {records.map((r, index) => {
              const time = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const date = new Date(r.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              const isToday = getOperationalDate(r.timestamp) === todayStr;
              const sequenceNumber = String(index + 1).padStart(2, '0');

              return (
                <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-xs sm:text-sm font-black text-slate-500 font-mono w-6 text-center">
                      {sequenceNumber}
                    </span>

                    <div className="bg-slate-900 border border-slate-600 px-3 py-1.5 rounded-lg text-center min-w-[90px]">
                      <div className="text-sm font-black font-mono text-white tracking-widest">{r.placa}</div>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-400 text-sm">{r.modelo}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {isToday ? `Hoje às ${time}` : `${date} às ${time}`}
                      </div>
                    </div>
                  </div>

                  {deleteConfirmId === r.id ? (
                    <div className="flex items-center gap-2 animate-fadeIn">
                      <button 
                        onClick={() => store.deleteRecord(r.id)}
                        className="bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg"
                      >
                        Apagar
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(r.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AjudaTab() {
  return (
    <div className="space-y-4 animate-fadeIn pb-6">
      <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-emerald-400 border-b border-slate-700 pb-3">
          <BookOpen className="w-6 h-6" />
          <h2 className="text-lg font-black tracking-tight text-white">Manual Operacional</h2>
        </div>

        <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Camera className="w-4 h-4" />
            <span>1. Dicas para Tirar Foto da Placa</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Para que a Inteligência Artificial leia a placa e o modelo em segundos com precisão sob a luz do pátio:
          </p>
          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
            <li><strong className="text-white">Ângulo ideal:</strong> Posicione o celular na altura do para-choque ou placa, de frente (evite fotos muito de lado).</li>
            <li><strong className="text-white">Luz solar:</strong> Se houver reflexo excessivo de sol na placa, aproxime-se e projete leve sombra com o próprio corpo para destacar os caracteres.</li>
            <li><strong className="text-white">Enquadramento:</strong> Mantenha a placa centralizada na tela antes de disparar.</li>
          </ul>
        </div>

        <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CalendarRange className="w-4 h-4" />
            <span>2. Como Usar o Filtro (Turnos Noturnos / Madrugada)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Se você trabalha em turnos que viram a noite (ex: 23:00 às 05:00):
          </p>
          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
            <li>O sistema já calcula automaticamente o <strong className="text-white">Dia Operacional</strong> das 06:00 às 05:59 do dia seguinte.</li>
            <li>Para refinar exato o horário do seu turno, vá na aba <strong className="text-white">Histórico</strong>, clique no botão <strong className="text-emerald-400">Filtro</strong>, selecione a data/hora inicial e final.</li>
            <li>Clique em <strong className="text-white">Turno PDF</strong> para exportar o relatório com exatamente o período selecionado.</li>
          </ul>
        </div>

        <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Lock className="w-4 h-4" />
            <span>3. Conta Individual e Segurança</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Cada operador possui sua conta protegida por PIN de 4 dígitos. Seus registros de lavagem são estritamente isolados: você controla e visualiza apenas a sua própria produção, garantindo segurança total contra edições ou consultas cruzadas.
          </p>
        </div>
      </div>
    </div>
  );
}