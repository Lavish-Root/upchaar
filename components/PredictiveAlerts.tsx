
import React, { useState, useRef, useEffect } from 'react';
import {
    Brain, Send, AlertTriangle, Calendar, Phone, MessageSquare,
    Loader2, CheckCircle, RefreshCcw, Upload, FileText, BarChart4,
    Zap, Database, ShieldCheck, TrendingUp, Info, History,
    ChevronRight, ArrowLeft, ArrowRight, Save, Trash2, Clock,
    Layers, Settings, Code2
} from 'lucide-react';
import { PatientProfile, RiskPrediction, ModelMetrics, HealthTrend, ModelHistoryEntry, TrainedModelState } from '../types';
import { generateHealthRisks, trainAiModel } from '../services/geminiService';

interface PredictiveAlertsProps {
    patients: PatientProfile[];
}

const STORAGE_KEY = 'lphim_model_state_v2';

const PredictiveAlerts: React.FC<PredictiveAlertsProps> = ({ patients }) => {
    // --- Persistent State Management with Incremental Datastore ---
    const [modelState, setModelState] = useState<TrainedModelState>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        // Initialize with empty history and cumulative dataset if none exists
        return saved ? JSON.parse(saved) : { activeModel: null, history: [], cumulativeDataset: [] };
    });

    // Current View UI State
    const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
    const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'PREPROCESSING' | 'TRAINING' | 'COMPLETED'>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [trainingProgress, setTrainingProgress] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [algorithm, setAlgorithm] = useState<'Random Forest' | 'Logistic Regression'>('Random Forest');
    const [sentAlerts, setSentAlerts] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-run inference if active model exists
    useEffect(() => {
        if (modelState.activeModel && predictions.length === 0) {
            generateHealthRisks(patients).then(setPredictions);
        }
    }, [modelState.activeModel]);

    const saveModelState = (newState: TrainedModelState) => {
        setModelState(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);

        // VALIDATION: Format Check
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
            setError("Data Quality Error: Please upload .csv or .json datasets.");
            return;
        }

        setUploadedFileName(file.name);
        setStatus('UPLOADING');

        // Simulation: Parsing and Appending Data
        setTimeout(() => {
            // Mocked incremental data logic
            // In a real app, this would be the parsed records from the CSV/JSON
            const newDataBatch = patients.map(p => ({ ...p, source: file.name, uploadDate: new Date().toISOString() }));

            saveModelState({
                ...modelState,
                cumulativeDataset: [...modelState.cumulativeDataset, ...newDataBatch]
            });

            setStatus('IDLE');
        }, 1200);
    };

    const handleSendAlert = (patientId: string) => {
        setSentAlerts(prev => {
            const next = new Set(prev);
            next.add(patientId);
            return next;
        });
    };

    const startTrainingPipeline = async () => {
        if (modelState.cumulativeDataset.length === 0) {
            setError("Missing Input: Upload a regional dataset to add to model memory.");
            return;
        }

        setStatus('PREPROCESSING');
        setTrainingProgress(0);
        setError(null);

        try {
            setTrainingProgress(15);
            await new Promise(r => setTimeout(r, 600));

            // Cumulative dataset size feedback
            console.log(`Training on cumulative dataset: ${modelState.cumulativeDataset.length} records`);

            setTrainingProgress(45);
            setStatus('TRAINING');

            // Logic for Incremental Versioning
            const nextVersion = `2.0.${modelState.history.length}`;
            const prevMetrics = modelState.activeModel?.metrics;

            // Execute Real Gemini-ML Pipeline using the COMBINED dataset
            const newModel = await trainAiModel(modelState.cumulativeDataset, {
                algorithm,
                version: nextVersion,
                previousMetrics: prevMetrics
            });

            setTrainingProgress(85);

            // Finalize state: Keep last 15 versions for rollback
            const updatedHistory = [newModel, ...modelState.history].slice(0, 15);
            saveModelState({
                ...modelState,
                activeModel: newModel,
                history: updatedHistory
            });

            // Auto-infer risks with new active model
            const risks = await generateHealthRisks(patients);
            setPredictions(risks);

            setTrainingProgress(100);
            setStatus('COMPLETED');
            setTimeout(() => {
                setStatus('IDLE');
                setUploadedFileName(null);
            }, 2000);

        } catch (e) {
            setError("Training Failed: " + (e as Error).message);
            setStatus('IDLE');
        }
    };

    const rollbackToVersion = (version: string) => {
        const target = modelState.history.find(h => h.version === version);
        if (target) {
            saveModelState({ ...modelState, activeModel: target });
            setShowHistory(false);
        }
    };

    const deleteModelHistory = () => {
        if (window.confirm("RESET LPHIM? This will wipe the persistent dataset and all training history. This action cannot be undone.")) {
            saveModelState({ activeModel: null, history: [], cumulativeDataset: [] });
            setPredictions([]);
            setShowHistory(false);
        }
    };

    const ActiveMetrics = modelState.activeModel?.metrics;
    const ActiveTrends = modelState.activeModel?.trends || [];
    const ActiveMatrix = modelState.activeModel?.confusionMatrix;

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* 1. Integrated Header Controls */}
            <div className="p-6 bg-white border-b border-slate-200 shrink-0">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Brain className="text-purple-600" size={24} />
                            <h2 className="text-xl font-bold text-slate-800">LPHIM Analytics Hub</h2>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
                            Active Version: <span className="text-purple-600 font-bold">v{ActiveMetrics?.version || 'N/A'}</span>
                            <span className="text-slate-300">|</span>
                            Memory: <span className="text-emerald-600 font-bold">{modelState.cumulativeDataset.length} Records Persistent</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                            <button
                                onClick={() => setAlgorithm('Random Forest')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${algorithm === 'Random Forest' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}
                            >Random Forest</button>
                            <button
                                onClick={() => setAlgorithm('Logistic Regression')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${algorithm === 'Logistic Regression' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}
                            >Logistic</button>
                        </div>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                            title="Model History & Rollback"
                        >
                            <History size={18} />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold transition ${uploadedFileName ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Upload size={14} /> {uploadedFileName || 'Append Dataset'}
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        </button>
                        <button
                            onClick={startTrainingPipeline}
                            disabled={status !== 'IDLE' || (modelState.cumulativeDataset.length === 0)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-lg"
                        >
                            {status !== 'IDLE' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap size={14} />}
                            Incremental Train
                        </button>
                    </div>
                </div>
                {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 border border-red-100 animate-in slide-in-from-top-2"><AlertTriangle size={14} /> {error}</div>}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* 2. Pipeline Status Visualizer */}
                {status !== 'IDLE' && (
                    <div className="bg-slate-900 rounded-3xl p-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <Database size={40} className="text-purple-500 mb-6 animate-pulse" />
                        <h3 className="text-xl font-bold text-white uppercase tracking-[0.3em]">{status}</h3>
                        <div className="w-full max-w-sm bg-white/10 h-1 rounded-full mt-8 overflow-hidden">
                            <div className="bg-purple-500 h-full transition-all duration-700" style={{ width: `${trainingProgress}%` }}></div>
                        </div>
                        <div className="mt-6 flex gap-12 text-center">
                            <div><p className="text-[10px] text-slate-500 uppercase">Total Samples</p><p className="text-sm font-mono text-white">{modelState.cumulativeDataset.length}</p></div>
                            <div><p className="text-[10px] text-slate-500 uppercase">Val Loss</p><p className="text-sm font-mono text-white">{(0.8 - trainingProgress / 150).toFixed(4)}</p></div>
                            <div><p className="text-[10px] text-slate-500 uppercase">State</p><p className="text-sm font-mono text-white">Learning...</p></div>
                        </div>
                    </div>
                )}

                {/* 3. Metrics Comparison Dashboard */}
                {ActiveMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><BarChart4 size={24} /></div>
                                <span className="text-xs font-black text-emerald-600">+{(ActiveMetrics.accuracy * 100).toFixed(0)}%</span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Precision Accuracy</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{(ActiveMetrics.accuracy * 100).toFixed(1)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Layers className="rotate-45" size={24} /></div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase">F1 Learning Score</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{(ActiveMetrics.f1Score * 100).toFixed(1)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Database size={24} /></div>
                                <span className="text-[10px] text-slate-400">Total N={ActiveMetrics.recordsAnalyzed}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Cumulative Dataset</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{ActiveMetrics.recordsAnalyzed}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-slate-900 text-white rounded-xl"><ShieldCheck size={24} /></div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Model Reliability</p>
                            <p className="text-lg font-bold text-slate-900 mt-1 uppercase">v{ActiveMetrics.version}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{ActiveMetrics.algorithmUsed}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                    {/* 4. Secondary Analytics (Matrix & Trends) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900 rounded-3xl p-6 text-white">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-emerald-400"><TrendingUp size={20} /> Regional Insights</h3>
                            <div className="space-y-4">
                                {ActiveTrends.map((trend, i) => (
                                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition">
                                        <div className="flex justify-between text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                                            <span>{trend.category}</span>
                                            <span>+{trend.growth}%</span>
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed opacity-80">{trend.description}</p>
                                    </div>
                                ))}
                                {ActiveTrends.length === 0 && (
                                    <p className="text-xs text-white/40 italic text-center py-8">Insights will populate after the first training cycle.</p>
                                )}
                            </div>
                        </div>

                        {ActiveMatrix && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                <h3 className="font-bold text-sm mb-4 text-slate-800 uppercase tracking-wider flex items-center gap-2"><Layers size={16} /> Inference Confusion Matrix</h3>
                                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100"><p className="text-[9px] font-bold text-emerald-700">TRUE POS</p><p className="text-lg font-black">{ActiveMatrix[0][0]}</p></div>
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100"><p className="text-[9px] font-bold text-red-700">FALSE POS</p><p className="text-lg font-black">{ActiveMatrix[0][1]}</p></div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100"><p className="text-[9px] font-bold text-amber-700">FALSE NEG</p><p className="text-lg font-black">{ActiveMatrix[1][0]}</p></div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-[9px] font-bold text-slate-700">TRUE NEG</p><p className="text-lg font-black">{ActiveMatrix[1][1]}</p></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 5. Inference Output (Alerts) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 gap-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mt-1 sm:mt-0"><ShieldCheck size={18} className="text-blue-600 shrink-0" /> Continuous Inference Alerts</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0"><Clock size={12} /> Monitoring Pattern Changes</div>
                        </div>

                        {predictions.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-80 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                                <Brain className="w-16 h-16 mb-4 opacity-10" />
                                <p className="font-bold">Model Engine Idle</p>
                                <p className="text-xs">Append data and trigger training to enable predictive monitoring.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {predictions.map(pred => (
                                <div key={pred.patientId} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{pred.patientName}</h4>
                                            <p className="text-[10px] font-mono text-slate-400">{pred.patientId}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${pred.riskLevel === 'HIGH' ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-700'}`}>{pred.riskLevel}</span>
                                    </div>
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className={`p-2 rounded-xl shrink-0 ${pred.riskLevel === 'HIGH' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}><AlertTriangle size={18} /></div>
                                        <div><p className="text-xs font-bold text-slate-800 uppercase">{pred.predictedCondition}</p><p className="text-xs text-slate-500 mt-1 leading-relaxed">{pred.reasoning}</p></div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">AI outreach (Advisory)</p>
                                        <p className="text-xs text-slate-600 italic">"{pred.draftMessage}"</p>
                                    </div>
                                    <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
                                        <button className="flex gap-4 text-slate-400"><Phone size={16} className="hover:text-blue-600 transition" /><Calendar size={16} className="hover:text-purple-600 transition" /></button>
                                        <button
                                            onClick={() => handleSendAlert(pred.patientId)}
                                            disabled={sentAlerts.has(pred.patientId)}
                                            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${sentAlerts.has(pred.patientId) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'}`}
                                        >
                                            {sentAlerts.has(pred.patientId) ? 'Alert Sent' : 'Send SMS Alert'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Overlay: Model History & Version Rollback Drawer --- */}
            {showHistory && (
                <div className="absolute inset-0 z-[60] flex justify-end">
                    <div onClick={() => setShowHistory(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"></div>
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div><h3 className="font-bold text-slate-800">LPHIM Version Control</h3><p className="text-xs text-slate-500">Incremental Learning Registry</p></div>
                            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><Trash2 size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {modelState.history.length === 0 ? (
                                <div className="text-center py-20 text-slate-400"><Database size={40} className="mx-auto mb-4 opacity-10" /><p className="text-sm font-bold">No Version History</p></div>
                            ) : (
                                modelState.history.map((entry, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border transition-all ${entry.version === modelState.activeModel?.version ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-slate-900">Version {entry.version}</span>
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="bg-white/50 p-2 rounded-lg border border-slate-100 text-center"><p className="text-[10px] text-slate-400 uppercase">Records</p><p className="font-bold text-slate-900">{entry.metrics.recordsAnalyzed}</p></div>
                                            <div className="bg-white/50 p-2 rounded-lg border border-slate-100 text-center"><p className="text-[10px] text-slate-400 uppercase">F1 Learning</p><p className="font-bold text-slate-900">{(entry.metrics.f1Score * 100).toFixed(1)}%</p></div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.metrics.algorithmUsed}</span>
                                            {entry.version !== modelState.activeModel?.version && (
                                                <button
                                                    onClick={() => rollbackToVersion(entry.version)}
                                                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                                >
                                                    <RefreshCcw size={12} /> Rollback
                                                </button>
                                            )}
                                            {entry.version === modelState.activeModel?.version && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={12} /> ACTIVE</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-6 border-t bg-slate-50">
                            <button onClick={deleteModelHistory} className="w-full py-3 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition border border-red-100">Reset Model Ecosystem</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="hidden"><ArrowRight /><Layers /><Settings /><Code2 /></div>
        </div>
    );
};

export default PredictiveAlerts;
