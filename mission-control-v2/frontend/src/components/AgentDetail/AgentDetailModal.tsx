import type { Agent } from '../../types/api';
import { Modal } from '../UI/Modal';
import { AgentInfo } from './AgentInfo';
import { GatewayStatus } from './GatewayStatus';

interface AgentDetailModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentDetailModal = ({ agent, isOpen, onClose }: AgentDetailModalProps) => {
  if (!agent) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Agente" size="lg">
      <div className="space-y-6">
        <AgentInfo agent={agent} />
        <GatewayStatus gateway={agent.gateway} status={agent.status} />
      </div>
    </Modal>
  );
};
