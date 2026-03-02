// Mission Control Frontend

// Detect base path from current URL
function detectBasePath() {
    const pathname = window.location.pathname;
    // If we're at /app or /app/, use /app as base
    if (pathname.startsWith('/app')) {
        return '/app';
    }
    return '';
}

const BASE_PATH = detectBasePath();
const API_BASE = window.location.origin + BASE_PATH + '/api';

// State
let agents = [];
let statusInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DevAlliance Mission Control initialized');
    console.log('📍 Base Path:', BASE_PATH);
    console.log('🔌 API Base:', API_BASE);
    loadAgents();
    startStatusPolling();
});

// Load agents list
async function loadAgents() {
    try {
        const response = await fetch(`${API_BASE}/agents`);
        const data = await response.json();
        
        if (data.ok) {
            agents = data.agents;
            await refreshStatus();
        }
    } catch (error) {
        console.error('Failed to load agents:', error);
        showError('Failed to connect to Mission Control API');
    }
}

// Refresh status of all agents
async function refreshStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        if (data.ok) {
            renderAgents(data.agents);
            updateSystemStatus(data.agents);
        }
    } catch (error) {
        console.error('Failed to refresh status:', error);
        updateSystemStatus([]);
    }
}

// Render agent cards
function renderAgents(agentStatuses) {
    const grid = document.getElementById('agentsGrid');
    
    if (!agents.length) {
        grid.innerHTML = '<div class="loading">Loading agents...</div>';
        return;
    }
    
    grid.innerHTML = agents.map(agent => {
        const status = agentStatuses.find(s => s.id === agent.id);
        const health = status?.health || 'unknown';
        
        return `
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-info">
                        <h3>${agent.name}</h3>
                        <div class="agent-role">${agent.role}</div>
                    </div>
                    <div class="agent-status ${health}">
                        ${health}
                    </div>
                </div>
                
                <p class="agent-description">${agent.description}</p>
                
                <div class="agent-capabilities">
                    ${agent.capabilities.map(cap => 
                        `<span class="capability-tag">${cap}</span>`
                    ).join('')}
                </div>
                
                <div class="agent-actions">
                    <button onclick="viewAgentDetails('${agent.id}')" class="btn btn-secondary btn-small">
                        📊 Details
                    </button>
                    <button onclick="callAgentStatus('${agent.id}')" class="btn btn-secondary btn-small">
                        🔍 Gateway Status
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update system status badge
function updateSystemStatus(agentStatuses) {
    const badge = document.getElementById('systemStatus');
    const dot = badge.querySelector('.status-dot');
    const text = badge.querySelector('.status-text');
    
    const healthyCount = agentStatuses.filter(a => a.health === 'healthy').length;
    const totalCount = agentStatuses.length;
    
    if (healthyCount === 0) {
        dot.className = 'status-dot offline';
        text.textContent = 'All Offline';
    } else if (healthyCount === totalCount) {
        dot.className = 'status-dot online';
        text.textContent = 'All Systems Online';
    } else {
        dot.className = 'status-dot partial';
        text.textContent = `${healthyCount}/${totalCount} Online`;
    }
}

// View agent details
async function viewAgentDetails(agentId) {
    const modal = document.getElementById('agentDetailModal');
    const modalBody = document.getElementById('modalAgentBody');
    const modalName = document.getElementById('modalAgentName');
    
    // Show modal with loading
    modal.classList.add('active');
    modalBody.innerHTML = '<div class="loading">Loading agent details...</div>';
    modalName.textContent = 'Loading...';
    
    try {
        const response = await fetch(`${API_BASE}/agents/${agentId}/status`);
        const data = await response.json();
        
        if (data.ok) {
            console.log(`Agent ${agentId} details:`, data);
            renderAgentDetail(data);
        } else {
            modalBody.innerHTML = `<div class="loading" style="color: var(--danger);">Error: ${data.error}</div>`;
        }
    } catch (error) {
        console.error('Failed to get agent details:', error);
        modalBody.innerHTML = `<div class="loading" style="color: var(--danger);">Failed to fetch agent details: ${error.message}</div>`;
    }
}

// Close agent detail modal
function closeAgentDetail() {
    const modal = document.getElementById('agentDetailModal');
    modal.classList.remove('active');
}

// Render agent detail modal content
function renderAgentDetail(data) {
    const { agent, health, gatewayStatus } = data;
    const modalName = document.getElementById('modalAgentName');
    const modalBody = document.getElementById('modalAgentBody');
    
    modalName.textContent = `${agent.name} - Details`;
    
    let html = `
        <div class="detail-section">
            <h3>Agent Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Name</label>
                    <value>${agent.name}</value>
                </div>
                <div class="detail-item">
                    <label>Role</label>
                    <value>${agent.role}</value>
                </div>
                <div class="detail-item">
                    <label>Health Status</label>
                    <value class="agent-status ${health.status}">${health.status}</value>
                </div>
                <div class="detail-item">
                    <label>Gateway URL</label>
                    <value style="font-size: 0.9rem; word-break: break-all;">${agent.gateway.url}</value>
                </div>
                <div class="detail-item full-width">
                    <label>Description</label>
                    <value style="font-weight: normal;">${agent.description}</value>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Capabilities</h3>
            <div class="agent-capabilities">
                ${agent.capabilities.map(cap => 
                    `<span class="capability-tag">${cap}</span>`
                ).join('')}
            </div>
        </div>
    `;
    
    if (gatewayStatus) {
        html += `
            <div class="detail-section">
                <h3>Gateway Status</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Version</label>
                        <value>${gatewayStatus.version || 'N/A'}</value>
                    </div>
                    <div class="detail-item">
                        <label>Uptime</label>
                        <value>${gatewayStatus.uptime ? formatUptime(gatewayStatus.uptime) : 'N/A'}</value>
                    </div>
                    <div class="detail-item">
                        <label>Agent ID</label>
                        <value>${gatewayStatus.agentId || 'N/A'}</value>
                    </div>
                    <div class="detail-item">
                        <label>Session Count</label>
                        <value>${gatewayStatus.sessionCount || 0}</value>
                    </div>
                </div>
            </div>
        `;
        
        if (gatewayStatus.sessions && gatewayStatus.sessions.length > 0) {
            html += `
                <div class="detail-section">
                    <h3>Active Sessions (${gatewayStatus.sessions.length})</h3>
                    <div class="detail-item full-width">
                        <pre>${JSON.stringify(gatewayStatus.sessions, null, 2)}</pre>
                    </div>
                </div>
            `;
        }
    }
    
    html += `
        <div class="detail-section">
            <h3>Actions</h3>
            <div class="detail-actions">
                <button onclick="refreshAgentDetail('${agent.id}')" class="btn btn-primary btn-small">
                    🔄 Refresh
                </button>
                <button onclick="callAgentStatus('${agent.id}')" class="btn btn-secondary btn-small">
                    🔍 Gateway Status
                </button>
                <button onclick="testAgentConnection('${agent.id}')" class="btn btn-secondary btn-small">
                    🔗 Test Connection
                </button>
                <button onclick="closeAgentDetail()" class="btn btn-secondary btn-small">
                    ✖ Close
                </button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
}

// Format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
}

// Refresh agent detail
async function refreshAgentDetail(agentId) {
    await viewAgentDetails(agentId);
}

// Test agent connection
async function testAgentConnection(agentId) {
    try {
        const response = await fetch(`${API_BASE}/agents/${agentId}/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'status',
                params: {}
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            alert(`✅ Connection successful!\n\nGateway responded:\n${JSON.stringify(data.result, null, 2)}`);
        } else {
            alert(`❌ Connection failed:\n${data.error}`);
        }
    } catch (error) {
        alert(`❌ Connection error:\n${error.message}`);
    }
}

// Call agent gateway status
async function callAgentStatus(agentId) {
    try {
        const response = await fetch(`${API_BASE}/agents/${agentId}/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'status',
                params: {}
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            console.log(`Gateway status for ${agentId}:`, data.result);
            alert(`Gateway Status:\n\n${JSON.stringify(data.result, null, 2)}`);
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Failed to call gateway:', error);
        alert('Failed to call gateway');
    }
}

// Test communication between agents
async function testCommunication() {
    alert('Communication test will be implemented in next version');
    console.log('Testing inter-agent communication...');
}

// Start polling
function startStatusPolling() {
    // Poll every 10 seconds
    statusInterval = setInterval(refreshStatus, 10000);
}

// Stop polling
function stopStatusPolling() {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
}

// Show error
function showError(message) {
    const grid = document.getElementById('agentsGrid');
    grid.innerHTML = `
        <div class="loading" style="color: var(--danger);">
            ❌ ${message}
        </div>
    `;
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAgentDetail();
    }
});

// Close modal on background click
document.getElementById('agentDetailModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'agentDetailModal') {
        closeAgentDetail();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopStatusPolling();
});
