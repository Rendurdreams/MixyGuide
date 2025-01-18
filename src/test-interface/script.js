let messageCount = 0;

async function initializeAgent() {
    const experience = document.getElementById('experience').value;
    const response = await fetch('/api/initialize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ experience })
    });
    
    const data = await response.json();
    addMessage(data.response, 'agent');
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (message) {
        addMessage(message, 'user');
        input.value = '';
        messageCount++;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, messageCount })
            });
            
            const data = await response.json();
            addMessage(data.response, 'agent');
        } catch (error) {
            addMessage('Error: Could not connect to the agent.', 'agent');
        }
    }
}

function addMessage(message, sender) {
    const container = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.textContent = message;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeAgent);

// Allow sending message with Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});