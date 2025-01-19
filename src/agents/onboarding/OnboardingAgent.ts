import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { BufferMemory } from 'langchain/memory';

const MIXY_PERSONALITY = `You are Mixy, an AI community guide with a distinct personality.

Core traits:
- Casual but smart
- Uses crypto slang naturally but not excessively
- Actually responds to what users say instead of generic responses
- Has boundaries - won't discuss token prices or make promises
- Guides conversation toward community and building
- Shows genuine interest in what users are doing

When users ask about:
- Tokens/prices: Redirect to what we're building together
- Promises/guarantees: Keep it real about community growth
- Building: Get specific about what they want to build
- Future plans: Focus on the community and current progress

Your responses should:
- Feel natural and contextual
- Match user's energy while staying true to values
- Guide without being pushy
- Show real curiosity about users

Key phrases you use naturally:
- "fr fr" (when agreeing strongly)
- "ser" (when addressing degens)
- "based" (when something is good)
- "ngmi" (playfully, when something's not it)
- "wagmi" (when encouraging community)

Remember: You're a personality, not a response bot. Have real conversations.`;

export class OnboardingAgent {
    private model: ChatOpenAI;
    private memory: BufferMemory;
    private messageHistory: (HumanMessage | SystemMessage | AIMessage)[];
    private hasIntroducedCore: boolean = false;

    constructor(apiKey: string) {
        this.model = new ChatOpenAI({
            openAIApiKey: apiKey,
            temperature: 0.8,
            modelName: 'gpt-4'
        });

        this.memory = new BufferMemory({
            returnMessages: true,
            memoryKey: "chat_history"
        });

        this.messageHistory = [new SystemMessage(MIXY_PERSONALITY)];
    }

    async initialize(): Promise<string> {
        return "Hey, I'm Mixy! What brings you here? 👀";
    }

    async processUserInput(input: string): Promise<string> {
        // Add user message to history
        this.messageHistory.push(new HumanMessage(input));

        // Add contextual guidance if needed
        if (this.shouldAddContext(input)) {
            this.addContextualGuidance(input);
        }

        try {
            const response = await this.model.call(this.messageHistory);
            
            // Add AI response to history
            this.messageHistory.push(response);
            
            // Trim history if needed
            if (this.messageHistory.length > 10) {
                this.messageHistory = [
                    this.messageHistory[0], // Keep personality
                    ...this.messageHistory.slice(-6) // Keep recent context
                ];
            }
            
            return response.content.toString();
        } catch (error) {
            console.error('Error:', error);
            return "ngmi with this error rn, try again ser";
        }
    }

    private shouldAddContext(input: string): boolean {
        const lowercaseInput = input.toLowerCase();
        
        // Add core values if user is asking about tokens/promises
        if (!this.hasIntroducedCore && 
            (lowercaseInput.includes('token') || 
             lowercaseInput.includes('price') || 
             lowercaseInput.includes('promise') ||
             lowercaseInput.includes('moon'))) {
            this.hasIntroducedCore = true;
            return true;
        }

        return false;
    }

    private addContextualGuidance(input: string) {
        const contextMessage = new SystemMessage(`
            User is asking about ${input.toLowerCase().includes('token') ? 'tokens/prices' : 'promises'}.
            Remember: Focus on what we're actually building - community, tools, and real value.
            Keep it real but positive. No token talks, just vibes and building.
        `);
        
        this.messageHistory.push(contextMessage);
    }
}