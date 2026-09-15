import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ConnectionState, SyncState } from '../types/order';

interface HeaderProps {
  connectionState: ConnectionState;
  syncState: SyncState;
  pendingOpsCount: number;
  onToggleConnection: () => void;
  onTriggerSync: () => void;
  onSimulateConflict: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  syncState,
  pendingOpsCount,
  onToggleConnection,
  onTriggerSync,
  onSimulateConflict,
  onResetData,
}) => {
  const isOnline = connectionState === 'online';

  return (
    <header className="header-container">
      <div className="header-left">
        <div className="logo-badge">Local-First</div>
        <h1 className="header-title">Gestão de Pedidos (POS Offline)</h1>
      </div>

      <div className="header-status-group">
        <div className={`status-pill ${isOnline ? 'status-online' : 'status-offline'}`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{isOnline ? 'Online (Conectado)' : 'Offline (Modo Local)'}</span>
        </div>

        <div className={`sync-badge sync-${syncState}`}>
          {syncState === 'syncing' && <RefreshCw size={14} className="spin" />}
          {syncState === 'synced' && <CheckCircle2 size={14} />}
          {syncState === 'pending' && <RefreshCw size={14} />}
          {syncState === 'conflict' && <ShieldAlert size={14} />}
          {syncState === 'failed' && <AlertTriangle size={14} />}
          <span>
            {syncState === 'synced' && 'Tudo sincronizado'}
            {syncState === 'syncing' && 'Sincronizando...'}
            {syncState === 'pending' && `${pendingOpsCount} pendentes de sync`}
            {syncState === 'conflict' && 'Conflito identificado!'}
            {syncState === 'failed' && `${pendingOpsCount} falhas na sync`}
          </span>
        </div>
      </div>

      <div className="header-actions">
        <button
          onClick={onToggleConnection}
          className={`btn btn-sm ${isOnline ? 'btn-danger' : 'btn-success'}`}
          title="Alternar entre modo Online e Offline"
        >
          {isOnline ? 'Simular Offline' : 'Simular Online'}
        </button>

        <button
          onClick={onTriggerSync}
          disabled={!isOnline || syncState === 'syncing'}
          className="btn btn-sm btn-primary"
          title="Forçar sincronização manual da fila"
        >
          <RefreshCw size={14} className={syncState === 'syncing' ? 'spin' : ''} />
          <span>Sincronizar</span>
        </button>

        <button
          onClick={onSimulateConflict}
          className="btn btn-sm btn-warning"
          title="Simular resposta 409 Conflict no próximo update"
        >
          <AlertTriangle size={14} />
          <span>Forçar 409</span>
        </button>

        <button
          onClick={onResetData}
          className="btn btn-sm btn-outline"
          title="Resetar banco de dados local e servidor para estado inicial"
        >
          Resetar Dados
        </button>
      </div>
    </header>
  );
};
